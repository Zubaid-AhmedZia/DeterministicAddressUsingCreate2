const { ethers } = require("ethers");

const FACTORY_ADDRESS = "0x875805B5ADdDB38f4e3496d868E1AC1fc06E59AC"; //factory 
const INIT_CODE_HASH  = " ";


// sanity check
if (!ethers.isAddress(FACTORY_ADDRESS)) {
  throw new Error("Invalid FACTORY_ADDRESS: " + FACTORY_ADDRESS);
}

async function findSaltWith777() {
  let i = 0n;

  while (true) {
    const salt = ethers.zeroPadValue(ethers.toBeHex(i), 32);

    const hash = ethers.keccak256(
      ethers.concat([
        "0xff",           // 1 byte
        FACTORY_ADDRESS,  // 20 bytes
        salt,             // 32 bytes
        INIT_CODE_HASH,   // 32 bytes
      ])
    );

    const addr = "0x" + hash.slice(-40); // last 20 bytes = address

    if (addr.toLowerCase().endsWith("777")) {
      console.log("✅ Found salt:", salt);
      console.log("✅ Predicted address:", addr);
      return { salt, addr };
    }

    if (i % 100000n === 0n) {
      console.log("Tried", i.toString(), "salts...");
    }

    i++;
  }
}

findSaltWith777().catch(console.error);
