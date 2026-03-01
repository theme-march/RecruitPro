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
    
    await connection.query(`CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL, role ENUM('super_admin', 'admin', 'agent', 'accountant', 'data_entry') NOT NULL, is_deleted TINYINT(1) NOT NULL DEFAULT 0, deleted_at TIMESTAMP NULL DEFAULT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_email (email), INDEX idx_role (role), INDEX idx_users_is_deleted (is_deleted)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await connection.query(`CREATE TABLE IF NOT EXISTS agents (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, phone VARCHAR(20), address TEXT, commission_rate DECIMAL(5,2) DEFAULT 0.00, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, INDEX idx_user_id (user_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await connection.query(`CREATE TABLE IF NOT EXISTS candidates (id INT AUTO_INCREMENT PRIMARY KEY, agent_id INT NULL, name VARCHAR(255) NOT NULL, passport_number VARCHAR(50) UNIQUE NOT NULL, phone VARCHAR(20), email VARCHAR(255), date_of_birth DATE, package_amount DECIMAL(10,2) DEFAULT 0.00, total_paid DECIMAL(10,2) DEFAULT 0.00, due_amount DECIMAL(10,2) DEFAULT 0.00, status VARCHAR(50) DEFAULT 'pending', passport_copy_url TEXT, cv_url TEXT, is_deleted TINYINT(1) NOT NULL DEFAULT 0, deleted_at TIMESTAMP NULL DEFAULT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE, INDEX idx_agent_id (agent_id), INDEX idx_status (status), INDEX idx_passport (passport_number), INDEX idx_candidates_is_deleted (is_deleted)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    try {
      await connection.query(`ALTER TABLE candidates MODIFY agent_id INT NULL`);
    } catch {
      // Ignore if already in expected state
    }
    await connection.query(`CREATE TABLE IF NOT EXISTS candidate_agents (id INT AUTO_INCREMENT PRIMARY KEY, candidate_id INT NOT NULL, agent_id INT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE, FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE, UNIQUE KEY unique_candidate_agent (candidate_id, agent_id), INDEX idx_candidate_id (candidate_id), INDEX idx_agent_id (agent_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await connection.query(
      `INSERT IGNORE INTO candidate_agents (candidate_id, agent_id)
       SELECT id, agent_id FROM candidates WHERE agent_id IS NOT NULL`
    );
    await connection.query(`CREATE TABLE IF NOT EXISTS candidate_documents (id INT AUTO_INCREMENT PRIMARY KEY, candidate_id INT NOT NULL, document_name VARCHAR(255) NOT NULL, document_url TEXT NOT NULL, file_size INT, mime_type VARCHAR(100), uploaded_by INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE, FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL, INDEX idx_candidate_id (candidate_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await connection.query(`CREATE TABLE IF NOT EXISTS agent_documents (id INT AUTO_INCREMENT PRIMARY KEY, agent_id INT NOT NULL, document_name VARCHAR(255) NOT NULL, document_url TEXT NOT NULL, file_size INT, mime_type VARCHAR(100), uploaded_by INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL, INDEX idx_agent_id (agent_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    
    await connection.query(`CREATE TABLE IF NOT EXISTS employers (id INT AUTO_INCREMENT PRIMARY KEY, company_name VARCHAR(255) NOT NULL, company_address TEXT, contact_person VARCHAR(255), contact_email VARCHAR(255), contact_phone VARCHAR(20), country VARCHAR(100), industry VARCHAR(100), website VARCHAR(255), logo_url TEXT, description TEXT, is_deleted TINYINT(1) NOT NULL DEFAULT 0, deleted_at TIMESTAMP NULL DEFAULT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, INDEX idx_company_name (company_name), INDEX idx_country (country), INDEX idx_employers_is_deleted (is_deleted)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log('✅ Employers table created');
    
    await connection.query(`CREATE TABLE IF NOT EXISTS employer_agents (id INT AUTO_INCREMENT PRIMARY KEY, employer_id INT NOT NULL, agent_id INT NOT NULL, status ENUM('active', 'inactive') DEFAULT 'active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (employer_id) REFERENCES employers(id) ON DELETE CASCADE, FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE, UNIQUE KEY unique_employer_agent (employer_id, agent_id), INDEX idx_employer_id (employer_id), INDEX idx_agent_id (agent_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log('✅ Employer-Agents table created');
    
    await connection.query(`CREATE TABLE IF NOT EXISTS employer_vacancies (id INT AUTO_INCREMENT PRIMARY KEY, employer_id INT NOT NULL, job_title VARCHAR(255) NOT NULL, required_count INT NOT NULL DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (employer_id) REFERENCES employers(id) ON DELETE CASCADE, INDEX idx_employer_id (employer_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log('âœ… Employer Vacancies table created');

    await connection.query(`CREATE TABLE IF NOT EXISTS employer_candidates (id INT AUTO_INCREMENT PRIMARY KEY, employer_id INT NOT NULL, candidate_id INT NOT NULL, vacancy_id INT NULL, position VARCHAR(255), joining_date DATE, salary DECIMAL(10,2), status ENUM('applied', 'selected', 'working', 'completed', 'terminated') DEFAULT 'applied', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (employer_id) REFERENCES employers(id) ON DELETE CASCADE, FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE, FOREIGN KEY (vacancy_id) REFERENCES employer_vacancies(id) ON DELETE SET NULL, UNIQUE KEY unique_employer_candidate (employer_id, candidate_id), INDEX idx_employer_id (employer_id), INDEX idx_candidate_id (candidate_id), INDEX idx_vacancy_id (vacancy_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log('✅ Employer-Candidates table created');
    
    await connection.query(`CREATE TABLE IF NOT EXISTS employer_documents (id INT AUTO_INCREMENT PRIMARY KEY, employer_id INT NOT NULL, document_name VARCHAR(255) NOT NULL, document_url TEXT NOT NULL, file_size INT, mime_type VARCHAR(100), target_type ENUM('agent', 'candidate', 'all') NOT NULL, target_id INT, description TEXT, uploaded_by INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (employer_id) REFERENCES employers(id) ON DELETE CASCADE, FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL, INDEX idx_employer_id (employer_id), INDEX idx_target_type (target_type), INDEX idx_target_id (target_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log('✅ Employer Documents table created');

    // Backward-compatible soft-delete columns for existing databases.
    try {
      await connection.query('ALTER TABLE users ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0');
    } catch {}
    try {
      await connection.query('ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL');
    } catch {}
    try {
      await connection.query('ALTER TABLE users ADD INDEX idx_users_is_deleted (is_deleted)');
    } catch {}
    try {
      await connection.query('ALTER TABLE candidates ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0');
    } catch {}
    try {
      await connection.query('ALTER TABLE candidates ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL');
    } catch {}
    try {
      await connection.query('ALTER TABLE candidates ADD INDEX idx_candidates_is_deleted (is_deleted)');
    } catch {}
    try {
      await connection.query('ALTER TABLE employers ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0');
    } catch {}
    try {
      await connection.query('ALTER TABLE employers ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL');
    } catch {}
    try {
      await connection.query('ALTER TABLE employers ADD INDEX idx_employers_is_deleted (is_deleted)');
    } catch {}
    try {
      await connection.query('ALTER TABLE employer_candidates ADD COLUMN vacancy_id INT NULL');
    } catch {}
    try {
      await connection.query('ALTER TABLE employer_candidates ADD INDEX idx_vacancy_id (vacancy_id)');
    } catch {}
    try {
      await connection.query('ALTER TABLE employer_candidates ADD CONSTRAINT fk_employer_candidates_vacancy_id FOREIGN KEY (vacancy_id) REFERENCES employer_vacancies(id) ON DELETE SET NULL');
    } catch {}

    const [adminRows] = await connection.query('SELECT * FROM users WHERE email = ? AND is_deleted = 0', ['admin@example.com']);
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
