import crypto from "crypto";

const IV = crypto.randomBytes(16);

function genkey(text, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(text, salt, 16, { N: 32 }, (err, derivedKey) => {
      if (err) reject(err);
      resolve(derivedKey.toString("hex"));
    });
  });
}

function encrypt(ENCRYPTION_KEY, text) {
  let cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    IV
  );
  let encrypted = cipher.update(text, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return { iv: IV.toString("hex"), data: encrypted.toString("hex") };
}

function decrypt(ENCRYPTION_KEY, hash) {
  let decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    IV
  );
  let decrypted = decipher.update(hash, "hex");
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return { iv: IV.toString("hex"), data: decrypted.toString("utf8") };
}

export default {
  genkey: genkey,
  encrypt: encrypt,
  decrypt: decrypt,
};
