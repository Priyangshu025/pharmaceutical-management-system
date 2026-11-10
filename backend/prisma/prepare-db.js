const fs = require('fs');
const path = require('path');

const dbUrl = process.env.DATABASE_URL || '';
const schemaPath = path.join(__dirname, 'schema.prisma');

if (fs.existsSync(schemaPath)) {
  let schemaContent = fs.readFileSync(schemaPath, 'utf8');

  if (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')) {
    console.log('[PMS Deployment] Detected PostgreSQL connection string.');
    console.log('[PMS Deployment] Updating Prisma provider to "postgresql"...');
    schemaContent = schemaContent.replace(/provider\s*=\s*"sqlite"/g, 'provider = "postgresql"');
    fs.writeFileSync(schemaPath, schemaContent, 'utf8');
  } else {
    console.log('[PMS Deployment] Using SQLite provider.');
  }
}
