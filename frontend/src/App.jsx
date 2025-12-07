import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { Wallet, Sparkles, Rocket, RefreshCw, Copy, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import SaltWorker from './saltWorker?worker'; // Vite worker import

const FACTORY_ADDRESS = "0x875805B5ADdDB38f4e3496d868E1AC1fc06E59AC";
const SEI_TESTNET_CHAIN_ID = '0x530'; // 1328
const SEI_RPC = "https://sei-testnet.g.alchemy.com/v2/iQEF9jQ4XvJyDIQMzYOvAPUvfWFSAvD1";

const FACTORY_ABI = [
  "function deploy(bytes32,string,string,string) external returns (address)",
  "function computeAddress(bytes32,string,string,string) view returns (address)"
];

function App() {
  const [wallet, setWallet] = useState(null);
  const [chainId, setChainId] = useState(null);

  const [formData, setFormData] = useState({ name: '', symbol: '', uri: '' });
  const [saltData, setSaltData] = useState({ salt: null, address: null });
  const [isComputing, setIsComputing] = useState(false);
  const [computeProgress, setComputeProgress] = useState(0);

  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedAddress, setDeployedAddress] = useState(null);
  const [error, setError] = useState(null);

  const workerRef = useRef(null);

  useEffect(() => {
    checkWallet();
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', checkWallet);
      window.ethereum.on('chainChanged', (c) => setChainId(c));
    }
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const checkWallet = async () => {
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        setWallet(accounts[0].address);
        const net = await provider.getNetwork();
        setChainId("0x" + net.chainId.toString(16));
      }
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Please install MetaMask!");
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      checkWallet();
      await switchNetwork();
    } catch (err) {
      console.error(err);
    }
  };

  const switchNetwork = async () => {
    if (chainId === SEI_TESTNET_CHAIN_ID) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEI_TESTNET_CHAIN_ID }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: SEI_TESTNET_CHAIN_ID,
              chainName: 'Sei Testnet',
              nativeCurrency: { name: 'SEI', symbol: 'SEI', decimals: 18 },
              rpcUrls: [SEI_RPC],
              blockExplorerUrls: ['https://sei.explorers.guru/'] // Fallback or known explorer
            }],
          });
        } catch (addError) {
          console.error(addError);
        }
      }
    }
  };

  const startComputation = () => {
    if (!formData.name || !formData.symbol || !formData.uri) {
      setError("Please fill all fields");
      return;
    }
    setError(null);
    setIsComputing(true);
    setSaltData({ salt: null, address: null });
    setComputeProgress(0);

    // Init worker
    if (workerRef.current) workerRef.current.terminate();
    workerRef.current = new SaltWorker();

    workerRef.current.postMessage(formData);

    workerRef.current.onmessage = (e) => {
      const { type, salt, addr, count } = e.data;
      if (type === 'found') {
        setSaltData({ salt, address: addr });
        setIsComputing(false);
        workerRef.current.terminate();
      } else if (type === 'progress') {
        setComputeProgress(parseInt(count));
      }
    };
  };

  const deploy = async () => {
    if (!saltData.salt) return;
    setIsDeploying(true);
    setError(null);
    try {
      await switchNetwork();
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);

      const tx = await factory.deploy(saltData.salt, formData.name, formData.symbol, formData.uri);
      await tx.wait();
      // Address is deterministic, we already know it, but event logs confirm it.
      // Or we can rely on saltData.address
      setDeployedAddress(saltData.address);
    } catch (err) {
      console.error(err);
      setError("Deployment failed: " + (err.reason || err.message));
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text font-sans selection:bg-primary/30">
      {/* Background Gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse-slow"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[100px] animate-pulse-slow delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="text-white w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              MemeLauncher
            </h1>
          </div>

          <button
            onClick={connectWallet}
            className="glass-panel px-4 py-2 rounded-full flex items-center gap-2 text-sm hover:bg-white/5 transition-colors"
          >
            <Wallet className="w-4 h-4 text-primary" />
            {wallet ? (
              <span className="font-mono text-primaryLight">{wallet.slice(0, 6)}...{wallet.slice(-4)}</span>
            ) : (
              "Connect Wallet"
            )}
          </button>
        </header>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-2xl p-8 mb-8"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-textDim uppercase tracking-wider">Token Name</label>
                <input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="e.g. Pepe"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-textDim uppercase tracking-wider">Symbol</label>
                <input
                  value={formData.symbol}
                  onChange={e => setFormData({ ...formData, symbol: e.target.value })}
                  className="input-field"
                  placeholder="PEPE"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-textDim uppercase tracking-wider">Metadata URI</label>
              <input
                value={formData.uri}
                onChange={e => setFormData({ ...formData, uri: e.target.value })}
                className="input-field"
                placeholder="ipfs://..."
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startComputation}
              disabled={isComputing || !formData.name}
              className={clsx(
                "w-full btn-primary flex justify-center items-center gap-2",
                isComputing && "animate-pulse cursor-wait"
              )}
            >
              {isComputing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Finding Lucky Address... ({computeProgress.toLocaleString()})
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Find 777 Address
                </>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Results Section */}
        <AnimatePresence>
          {saltData.address && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              {/* Success Card */}
              <div className="glass-panel rounded-2xl p-8 border-green-500/20 bg-green-500/5">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-green-500/20 rounded-full text-green-400">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Salt Found!</h3>
                    <p className="text-sm text-textDim">Your contract will end in ...777</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="p-4 bg-black/40 rounded-lg font-mono text-sm break-all relative group">
                    <div className="text-xs text-textDim mb-1">Target Address</div>
                    <span className="text-green-400">{saltData.address}</span>
                  </div>
                  <div className="p-4 bg-black/40 rounded-lg font-mono text-xs break-all text-textDim">
                    <div className="text-xs text-textDim/50 mb-1">Salt</div>
                    {saltData.salt}
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={deploy}
                  disabled={isDeploying || deployedAddress}
                  className="w-full btn-primary bg-gradient-to-r from-green-600 to-emerald-600 flex justify-center items-center gap-2"
                >
                  {isDeploying ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Deploying...
                    </>
                  ) : deployedAddress ? (
                    <>
                      <Rocket className="w-5 h-5" />
                      Deployed Successfully
                    </>
                  ) : (
                    <>
                      <Rocket className="w-5 h-5" />
                      Deploy Contract
                    </>
                  )}
                </motion.button>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm text-center">
                  {error}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
