export interface PeerDeviceInfo {
  name: string;
  version: string;
}

export interface Peer {
  id: string;
  displayName: string;
  device: PeerDeviceInfo;
}

