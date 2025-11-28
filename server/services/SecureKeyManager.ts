/**
 * Secure Key Management Service
 * 
 * This service provides secure access to API keys without storing them locally.
 * Keys are fetched from secure external services or injected at runtime.
 */

interface KeyConfig {
  openai?: string;
  anthropic?: string;
  huggingface?: string;
}

class SecureKeyManager {
  private keys: KeyConfig = {};
  private initialized = false;

  /**
   * Initialize keys from secure sources
   * This could be from:
   * - AWS Secrets Manager
   * - Azure Key Vault
   * - HashiCorp Vault
   * - Runtime injection
   */
  async initializeKeys(): Promise<void> {
    try {
      // Option 1: Runtime injection (most secure for development)
      this.keys = {
        openai: process.env.OPENAI_API_KEY,
        anthropic: process.env.ANTHROPIC_API_KEY,
        huggingface: process.env.HUGGINGFACE_API_KEY
      };

      // Option 2: External key management service
      // this.keys = await this.fetchFromKeyVault();

      this.initialized = true;
      console.log('🔐 Secure key manager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize secure key manager:', error);
      throw error;
    }
  }

  /**
   * Get API key with validation
   */
  getKey(service: keyof KeyConfig): string | undefined {
    if (!this.initialized) {
      throw new Error('Key manager not initialized');
    }
    
    const key = this.keys[service];
    if (key && this.isValidKey(key, service)) {
      return key;
    }
    
    return undefined;
  }

  /**
   * Validate API key format
   */
  private isValidKey(key: string, service: keyof KeyConfig): boolean {
    const patterns = {
      openai: /^sk-[a-zA-Z0-9]{48}$/,
      anthropic: /^sk-ant-[a-zA-Z0-9]{32}$/,
      huggingface: /^hf_[a-zA-Z0-9]{34}$/
    };

    return patterns[service]?.test(key) || false;
  }

  /**
   * Check if any AI service is available
   */
  hasAnyAIService(): boolean {
    return !!(this.keys.openai || this.keys.anthropic || this.keys.huggingface);
  }

  /**
   * Get available services
   */
  getAvailableServices(): string[] {
    const services: string[] = [];
    if (this.keys.openai) services.push('openai');
    if (this.keys.anthropic) services.push('anthropic');
    if (this.keys.huggingface) services.push('huggingface');
    return services;
  }
}

export const keyManager = new SecureKeyManager();
