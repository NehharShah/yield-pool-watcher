import { IProtocolProvider } from "../types/universal.js";
import { AaveUniversalProvider } from "./aave-universal.js";
import { CompoundUniversalProvider } from "./compound-universal.js";
import { MorphoUniversalProvider } from "./morpho-universal.js";

export class ProtocolProviderFactory {
  private static providers: Map<string, IProtocolProvider> = new Map();

  static create(protocol: string): IProtocolProvider {
    // Use singleton pattern for providers
    if (!this.providers.has(protocol)) {
      switch (protocol) {
        case 'aave_v3':
          this.providers.set(protocol, new AaveUniversalProvider());
          break;
        case 'compound_v3':
          this.providers.set(protocol, new CompoundUniversalProvider());
          break;
        case 'morpho':
          this.providers.set(protocol, new MorphoUniversalProvider());
          break;
        default:
          throw new Error(`Unsupported protocol: ${protocol}. Supported protocols: aave_v3, compound_v3, morpho`);
      }
    }
    
    return this.providers.get(protocol)!;
  }

  static getSupportedProtocols(): string[] {
    return ['aave_v3', 'compound_v3', 'morpho'];
  }

  static getProtocolInfo(protocol: string): { name: string; description: string } {
    const info: Record<string, { name: string; description: string }> = {
      'aave_v3': {
        name: 'Aave V3',
        description: 'Decentralized lending protocol with variable and stable rates'
      },
      'compound_v3': {
        name: 'Compound V3',
        description: 'Algorithmic money market protocol with isolated markets'
      },
      'morpho': {
        name: 'Morpho Blue',
        description: 'Lending protocol optimizer that improves rates on top of Aave and Compound'
      }
    };
    
    return info[protocol] || { name: protocol, description: 'Unknown protocol' };
  }
}
