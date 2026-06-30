import mysql from 'mysql2/promise';

let pool;

function dbConfig() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const p = new URL(url);
    return {
      host: p.hostname,
      port: p.port ? Number(p.port) : 3306,
      database: decodeURIComponent(p.pathname.replace(/^\//, '')),
      user: decodeURIComponent(p.username || ''),
      password: decodeURIComponent(p.password || ''),
    };
  }
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME || 'mod3',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
  };
}

function pdo() {
  if (!pool) {
    pool = mysql.createPool({
      ...dbConfig(),
      charset: 'utf8mb4',
      waitForConnections: true,
      connectionLimit: 5,
      maxIdle: 5,
      idleTimeout: 60000,
    });
  }
  return pool;
}

export async function query(sql, params = []) {
  const [result] = await pdo().execute(sql, params);
  return result;
}

export async function fetch(sql, params = []) {
  const [rows] = await pdo().query(sql, params);
  return rows[0] || null;
}

export async function fetchAll(sql, params = []) {
  const [rows] = await pdo().query(sql, params);
  return rows;
}

export async function safeFetchAll(sql, params = []) {
  try {
    return await fetchAll(sql, params);
  } catch {
    return [];
  }
}

export async function getConnection() {
  return pdo().getConnection();
}

export default pdo;
