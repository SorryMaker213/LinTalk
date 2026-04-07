const crypto = require('crypto');

const keyPair = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

function getPublicKey() {
  return keyPair.publicKey;
}

function decryptPassword(encryptedBase64) {
  try {
    const decoded = Buffer.from(encryptedBase64, 'base64');
    const plain = crypto.privateDecrypt(
      {
        key: keyPair.privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      decoded
    );
    return plain.toString('utf8');
  } catch {
    return null;
  }
}

module.exports = {
  getPublicKey,
  decryptPassword
};
