import { Connection, Keypair } from "@solana/web3.js";
import * as bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";
import { Config } from "./Config";

export class SolanaEngine {
  private connection: Connection;
  private keypair: Keypair | null = null;

  constructor() {
    // الاتصال بشبكة سولانا باستخدام الرابط الموجود في الإعدادات
    this.connection = new Connection(Config.solana.rpcUrl, "confirmed");
  }

  public async initializeWallet(): Promise<void> {
    try {
      if (!Config.solana.mnemonic) {
        console.warn("⚠️ [Solana]: لم يتم العثور على الـ 24 كلمة (Mnemonic) في الإعدادات.");
        return;
      }

      // تحويل الـ 24 كلمة إلى Seed (البذرة الأساسية)
      const seed = await bip39.mnemonicToSeed(Config.solana.mnemonic);
      
      // مسار الاشتقاق القياسي لمحفظة فانتوم وغيرها من محافظ سولانا
      const derivationPath = "m/44'/501'/0'/0'";
      const derivedSeed = derivePath(derivationPath, seed.toString("hex")).key;
      
      // توليد المفتاح الخاص وعنوان المحفظة
      this.keypair = Keypair.fromSeed(derivedSeed);
      
      console.log(`🔗 [Solana]: تم فك التشفير بنجاح! عنوان المحفظة: ${this.keypair.publicKey.toBase58()}`);
      
      // جلب الرصيد للتأكد من الاتصال الفعلي بالبلوكتشين
      const balance = await this.connection.getBalance(this.keypair.publicKey);
      console.log(`💰 [Solana]: الرصيد الحالي: ${balance / 10 ** 9} SOL`);

    } catch (error: any) {
      console.error("❌ [Solana]: خطأ في فك تشفير المحفظة أو الاتصال بالشبكة:", error.message);
    }
  }
}