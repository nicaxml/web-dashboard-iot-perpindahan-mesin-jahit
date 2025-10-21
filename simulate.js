const axios = require('axios');

async function simulateMove() {
  const dummyMachines = [
    { id_mesin: 'M001', line_baru: 'Line A' },
    { id_mesin: 'M002', line_baru: 'Line B' },
    { id_mesin: 'M003', line_baru: 'Line C' },
    { id_mesin: 'M004', line_baru: 'Line D' },
  ];

  const randomMachine = dummyMachines[Math.floor(Math.random() * dummyMachines.length)];

  try {
    const res = await axios.post('http://localhost:3000/update', randomMachine);
    console.log(`Simulated: ${randomMachine.id_mesin} → ${randomMachine.line_baru}`);
  } catch (err) {
    console.error('Error sending data:', err.message);
  }
}

setInterval(simulateMove, 10000);
