const bcrypt = require('bcryptjs');

const password = 'admin'; // ubah sesuai keinginan
const hashed = bcrypt.hashSync(password, 10);

console.log('Password asli :', password);
console.log('Hasil hash bcrypt :', hashed);
