import express from 'express';
import { query, transaction as runTransaction } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { Candidate, SSLTransaction } from '../types';

const router = express.Router();

// SSLCommerz Credentials (can be supplied via env)
const STORE_ID = process.env.SSL_STORE_ID || 'testbox';
const STORE_PASS = process.env.SSL_STORE_PASSWORD || 'qwerty';
const IS_SANDBOX = process.env.SSL_IS_SANDBOX !== 'false';
const SSL_API_URL = IS_SANDBOX 
  ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php' 
  : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';

// helper to compute application url for callbacks
function getAppUrl(req: any) {
  let appUrl = process.env.APP_URL;
  if (!appUrl) {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['host'];
    appUrl = `${protocol}://${host}`;
  }
  return appUrl.replace(/\/$/, '');
}

// Initialize SSLCommerz Payment
router.post('/init', authenticateToken, async (req: any, res) => {
  const { candidate_id, amount, payment_type } = req.body;
  const tran_id = `SSLC_${uuidv4().slice(0, 8).toUpperCase()}`;

  try {
    const candidates = await query<Candidate[]>('SELECT * FROM candidates WHERE id = ?', [candidate_id]);
    const candidate = candidates[0];    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    await query(
      `INSERT INTO ssl_transactions (candidate_id, amount, payment_type, tran_id, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [candidate_id, parseFloat(amount), payment_type, tran_id]
    );

    const appUrl = getAppUrl(req);
    const data = new URLSearchParams();
    data.append('store_id', STORE_ID);
    data.append('store_passwd', STORE_PASS);
    data.append('total_amount', amount.toString());
    data.append('currency', 'BDT');
    data.append('tran_id', tran_id);
    data.append('success_url', `${appUrl}/api/sslcommerz/success`);
    data.append('fail_url', `${appUrl}/api/sslcommerz/fail`);
    data.append('cancel_url', `${appUrl}/api/sslcommerz/cancel`);
    data.append('ipn_url', `${appUrl}/api/sslcommerz/ipn`);
    data.append('shipping_method', 'NO');
    data.append('product_name', payment_type || 'Service Payment');
    data.append('product_category', 'Service');
    data.append('product_profile', 'general');
    data.append('cus_name', candidate.name || 'Customer');
    data.append('cus_email', candidate.email || 'customer@example.com');
    data.append('cus_phone', candidate.phone || '01700000000');
    data.append('cus_add1', 'Dhaka');
    data.append('cus_city', 'Dhaka');
    data.append('cus_country', 'Bangladesh');

    try {
      const response = await axios.post(SSL_API_URL, data, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      if (response.data.status === 'SUCCESS') {
        res.json({ url: response.data.GatewayPageURL });
      } else {
        console.error('SSL Init Error Response:', response.data);
        res.status(400).json({ message: response.data.failedreason || 'Failed to initialize payment' });
      }
    } catch (error: any) {
      console.error('SSL API Error:', error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  } catch (error) {
    console.error('SSL Init Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Success/Fail/Cancel Callbacks handled via shared helper
async function processCallback(req: any, res: any, status: 'success' | 'failed' | 'cancelled') {
  const { tran_id } = req.body;
  const appUrl = getAppUrl(req);

  try {
    const trRows = await query<SSLTransaction[]>('SELECT * FROM ssl_transactions WHERE tran_id = ?', [tran_id]);
    const transaction = trRows[0];    if (!transaction) {
      console.error('Transaction not found for tran_id:', tran_id);
      return res.redirect(`${appUrl}/payment/fail?msg=Transaction Not Found&tran_id=${tran_id}`);
    }

    await query('UPDATE ssl_transactions SET status = ? WHERE tran_id = ?', [status, tran_id]);

    if (status === 'success' && transaction.status !== 'success') {
      await runTransaction(async (conn) => {
        await conn.query(
          `INSERT INTO payments (candidate_id, amount, payment_type, payment_method, transaction_id, notes)
           VALUES (?, ?, ?, 'sslcommerz', ?, ?)`,
          [transaction.candidate_id, transaction.amount, transaction.payment_type, tran_id, 'SSLCommerz Online Payment']
        );

        const candRows = await conn.query('SELECT * FROM candidates WHERE id = ?', [transaction.candidate_id]);
        const candidate = (candRows as any)[0] || { total_paid: 0, package_amount: 0 };

        const amountNum = parseFloat(transaction.amount as any);
        const newTotalPaid = (parseFloat(candidate.total_paid) || 0) + amountNum;
        const newDue = (parseFloat(candidate.package_amount) || 0) - newTotalPaid;

        await conn.query('UPDATE candidates SET total_paid = ?, due_amount = ? WHERE id = ?', [
          newTotalPaid,
          newDue,
          transaction.candidate_id
        ]);
      });
    }

    if (status === 'success') {
      return res.redirect(`${appUrl}/payment/success/${tran_id}?candidate_id=${transaction.candidate_id}`);
    }
    if (status === 'failed') {
      return res.redirect(`${appUrl}/payment/fail?msg=Payment Failed&candidate_id=${transaction?.candidate_id}`);
    }
    if (status === 'cancelled') {
      return res.redirect(`${appUrl}/payment/cancel?candidate_id=${transaction?.candidate_id}`);
    }
  } catch (err) {
    console.error('SSL Callback Error:', err);
    res.redirect(`${appUrl}/payment/fail?msg=Server Error`);
  }
}

router.post('/success', (req, res) => processCallback(req, res, 'success'));
router.post('/fail', (req, res) => processCallback(req, res, 'failed'));
router.post('/cancel', (req, res) => processCallback(req, res, 'cancelled'));

// IPN Callback (Instant Payment Notification)
router.post('/ipn', (req, res) => {
  const { tran_id, status } = req.body;
  console.log('SSL IPN received:', { tran_id, status });
  res.status(200).send('OK');
});

export default router;


