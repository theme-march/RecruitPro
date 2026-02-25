import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'manpower_recruitment_db',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

pool.getConnection()
  .then(connection => {
    console.log('✅ MySQL Database connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('❌ MySQL connection error:', err.message);
    process.exit(1);
  });

export async function query<T = any>(sql: string, params: any[] = []): Promise<T> {
  const [rows] = await pool.query(sql, params);
  return rows as T;
}

export async function transaction<T>(cb: (conn: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await cb(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export const initDb = async () => {
  try {
    const connection = await pool.getConnection();
    
    await connection.query(`CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL, role ENUM('super_admin', 'admin', 'agent', 'accountant', 'data_entry') NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_email (email), INDEX idx_role (role)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await connection.query(`CREATE TABLE IF NOT EXISTS agents (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, phone VARCHAR(20), address TEXT, commission_rate DECIMAL(5,2) DEFAULT 0.00, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, INDEX idx_user_id (user_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await connection.query(`CREATE TABLE IF NOT EXISTS packages (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE, amount DECIMAL(10,2) NOT NULL, description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_name (name)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    
    const [packageRows] = await connection.query('SELECT COUNT(*) as cnt FROM packages');
    if ((packageRows as any[])[0].cnt === 0) {
      console.log('📦 Seeding default packages');
      await connection.query(`INSERT INTO packages (name, amount, description) VALUES ('Basic', 1000.00, 'Entry level package'), ('Standard', 2500.00, 'Most popular package'), ('Premium', 5000.00, 'Top tier package with extras')`);
    }

    await connection.query(`CREATE TABLE IF NOT EXISTS candidates (id INT AUTO_INCREMENT PRIMARY KEY, agent_id INT NOT NULL, name VARCHAR(255) NOT NULL, passport_number VARCHAR(50) UNIQUE NOT NULL, phone VARCHAR(20), email VARCHAR(255), date_of_birth DATE, package_amount DECIMAL(10,2) DEFAULT 0.00, total_paid DECIMAL(10,2) DEFAULT 0.00, due_amount DECIMAL(10,2) DEFAULT 0.00, status VARCHAR(50) DEFAULT 'pending', passport_copy_url TEXT, cv_url TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE, INDEX idx_agent_id (agent_id), INDEX idx_status (status), INDEX idx_passport (passport_number)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await connection.query(`CREATE TABLE IF NOT EXISTS payments (id INT AUTO_INCREMENT PRIMARY KEY, candidate_id INT NOT NULL, amount DECIMAL(10,2) NOT NULL, payment_type ENUM('visa', 'medical', 'ticket', 'service') NOT NULL, payment_method ENUM('cash', 'sslcommerz') NOT NULL, transaction_id VARCHAR(255), notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE, INDEX idx_candidate_id (candidate_id), INDEX idx_payment_type (payment_type)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await connection.query(`CREATE TABLE IF NOT EXISTS ssl_transactions (id INT AUTO_INCREMENT PRIMARY KEY, candidate_id INT NOT NULL, amount DECIMAL(10,2) NOT NULL, payment_type VARCHAR(50) NOT NULL, tran_id VARCHAR(255) UNIQUE NOT NULL, status ENUM('pending', 'success', 'failed', 'cancelled') DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE, INDEX idx_candidate_id (candidate_id), INDEX idx_tran_id (tran_id), INDEX idx_status (status)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await connection.query(`CREATE TABLE IF NOT EXISTS candidate_documents (id INT AUTO_INCREMENT PRIMARY KEY, candidate_id INT NOT NULL, document_name VARCHAR(255) NOT NULL, document_url TEXT NOT NULL, file_size INT, mime_type VARCHAR(100), uploaded_by INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE, FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL, INDEX idx_candidate_id (candidate_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    
    await connection.query(`CREATE TABLE IF NOT EXISTS employers (id INT AUTO_INCREMENT PRIMARY KEY, company_name VARCHAR(255) NOT NULL, company_address TEXT, contact_person VARCHAR(255), contact_email VARCHAR(255), contact_phone VARCHAR(20), country VARCHAR(100), industry VARCHAR(100), website VARCHAR(255), logo_url TEXT, description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, INDEX idx_company_name (company_name), INDEX idx_country (country)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log('✅ Employers table created');
    
    await connection.query(`CREATE TABLE IF NOT EXISTS employer_agents (id INT AUTO_INCREMENT PRIMARY KEY, employer_id INT NOT NULL, agent_id INT NOT NULL, status ENUM('active', 'inactive') DEFAULT 'active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (employer_id) REFERENCES employers(id) ON DELETE CASCADE, FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE, UNIQUE KEY unique_employer_agent (employer_id, agent_id), INDEX idx_employer_id (employer_id), INDEX idx_agent_id (agent_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log('✅ Employer-Agents table created');
    
    await connection.query(`CREATE TABLE IF NOT EXISTS employer_candidates (id INT AUTO_INCREMENT PRIMARY KEY, employer_id INT NOT NULL, candidate_id INT NOT NULL, position VARCHAR(255), joining_date DATE, salary DECIMAL(10,2), status ENUM('applied', 'selected', 'working', 'completed', 'terminated') DEFAULT 'applied', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (employer_id) REFERENCES employers(id) ON DELETE CASCADE, FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE, UNIQUE KEY unique_employer_candidate (employer_id, candidate_id), INDEX idx_employer_id (employer_id), INDEX idx_candidate_id (candidate_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log('✅ Employer-Candidates table created');
    
    await connection.query(`CREATE TABLE IF NOT EXISTS employer_documents (id INT AUTO_INCREMENT PRIMARY KEY, employer_id INT NOT NULL, document_name VARCHAR(255) NOT NULL, document_url TEXT NOT NULL, file_size INT, mime_type VARCHAR(100), target_type ENUM('agent', 'candidate', 'all') NOT NULL, target_id INT, description TEXT, uploaded_by INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (employer_id) REFERENCES employers(id) ON DELETE CASCADE, FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL, INDEX idx_employer_id (employer_id), INDEX idx_target_type (target_type), INDEX idx_target_id (target_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log('✅ Employer Documents table created');

    const [adminRows] = await connection.query('SELECT * FROM users WHERE email = ?', ['admin@example.com']);
    if ((adminRows as any[]).length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await connection.query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', ['Super Admin', 'admin@example.com', hashedPassword, 'super_admin']);
      console.log('✅ Default Super Admin created');
      console.log('   Email: admin@example.com');
      console.log('   Password: admin123');
    }

    connection.release();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
};

export default pool;
