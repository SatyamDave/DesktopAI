import * as crypto from 'crypto';

class SecurityService {
  // Sign a script with a private key
  signScript(script: string, privateKey: string): { script: string; signature: string } {
    const sign = crypto.createSign('SHA256');
    sign.update(script);
    sign.end();
    const signature = sign.sign(privateKey, 'base64');
    return { script, signature };
  }

  // Verify a script with a public key
  verifyScript(script: string, signature: string, publicKey: string): boolean {
    const verify = crypto.createVerify('SHA256');
    verify.update(script);
    verify.end();
    return verify.verify(publicKey, signature, 'base64');
  }
}

export const securityService = new SecurityService(); 