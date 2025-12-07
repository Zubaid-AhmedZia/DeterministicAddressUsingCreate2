import { ethers } from "ethers";

const FACTORY_ADDRESS = "0xd8b934580fcE35a11B58C6D73aDeE468a2833fa8";
const initialValue = 42;

const SimpleArtifact = {
  bytecode: "0x6080604052348015600e575f5ffd5b5060405160c938038060c9833981016040819052602991602f565b5f556045565b5f60208284031215603e575f5ffd5b5051919050565b60798060505f395ff3fe6080604052348015600e575f5ffd5b50600436106026575f3560e01c80633fa4f24514602a575b5f5ffd5b60315f5481565b60405190815260200160405180910390f3fea264697066735822122034758af5f97b25183bacbd2c6100d5bedb8e4eb29f0ae616617c08637625b8d064736f6c634300081e0033" // put compiled Simple bytecode here
};

async function findSaltWith777() {
  // init code = bytecode + encoded constructor args
  const initCode = ethers.concat([
    SimpleArtifact.bytecode,
    ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [initialValue])
  ]);

  const initCodeHash = ethers.keccak256(initCode);

  let i = 0n;

  while (true) {
    const salt = ethers.zeroPadValue(ethers.toBeHex(i), 32);

    const hash = ethers.keccak256(
      ethers.concat([
        "0xff",
        FACTORY_ADDRESS,
        salt,
        initCodeHash
      ])
    );

    const addr = "0x" + hash.slice(-40); // last 20 bytes

    if (addr.toLowerCase().endsWith("777")) {
      console.log("Found nice salt:", salt);
      console.log("Predicted address:", addr);
      return { salt, addr };
    }

    i++;
  }
}

findSaltWith777().catch(console.error);
