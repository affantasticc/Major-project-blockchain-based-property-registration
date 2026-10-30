
import { ethers } from "ethers";

const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

const ABI = [
  "function propertyCount() view returns (uint256)",
  "function registerProperty(string _name, string _location)",
  "function transferProperty(uint256 _id, address _newOwner)",
  "function getProperty(uint256 _id) view returns (tuple(uint256 id, string name, string location, address owner))",
];

export async function getSigner() {
  if (!window.ethereum) {
    throw new Error("Please install MetaMask.");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  return provider.getSigner();
}

export async function getContract(signer) {
  return new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
}

export function short(address) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
}

export function tsToDate(timestamp) {
  if (!timestamp) return "N/A";
  return new Date(Number(timestamp) * 1000).toLocaleString();
}
