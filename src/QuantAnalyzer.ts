export type MarketRegime = "TRENDING" | "RANGING" | "VOLATILE_CHOP" | "UNKNOWN";

export class QuantAnalyzer {
  
  /**
   * 1. فلتر حالة السوق (Regime Filter)
   * يحدد ما إذا كان السوق يتخذ اتجاهاً واضحاً أم متذبذباً لتفعيل الاستراتيجية المناسبة
   */
  public detectMarketRegime(adx: number, atr: number, averageAtr: number): MarketRegime {
    // إذا كان مؤشر قوة الاتجاه أعلى من 25، فالسوق في حالة اتجاه (Trend)
    if (adx > 25) {
      return "TRENDING";
    } 
    // إذا كان التذبذب الحالي أعلى من المتوسط بـ 1.5 ضعف، فالسوق عنيف ومتقلب
    else if (atr > averageAtr * 1.5) {
      return "VOLATILE_CHOP";
    } 
    // خلاف ذلك، السوق يسير في نطاق عرضي (Range)
    else if (adx <= 25) {
      return "RANGING";
    }
    
    return "UNKNOWN";
  }

  /**
   * 2. تحليل تدفق الأوامر (Order Flow Imbalance - OFI)
   * يحسب الفجوة بين حجم طلبات الشراء وحجم عروض البيع لاصطياد فخاخ السيولة
   */
  public calculateOFI(bidVolume: number, askVolume: number): number {
    const totalVolume = bidVolume + askVolume;
    if (totalVolume === 0) return 0;
    
    // النتيجة ستكون بين -1 (سيطرة بيعية تامة) و +1 (سيطرة شرائية تامة)
    return (bidVolume - askVolume) / totalVolume;
  }

  /**
   * 3. رصد فجوات السيولة (Liquidity Gaps)
   * يحدد المناطق التي تفتقر إلى عمق الأوامر والتي من المحتمل أن يقفز السعر إليها بسرعة
   */
  public detectLiquidityGaps(orderBook: any[], currentPrice: number, thresholdPercent: number = 0.5): boolean {
    // سيتم استدعاء بيانات المستوى الثاني (Level 2 Data) هنا لاحقاً
    // حالياً نقوم ببناء الهيكل الأساسي
    return false; 
  }

  /**
   * 4. دمج المؤشرات المتقدمة (CMO & CMF)
   * استخراج التباين (Divergence) بين حركة السعر وتدفق الأموال الذكية
   */
  public analyzeSmartMoneyDivergence(priceTrend: "UP" | "DOWN", cmfValue: number): string {
    if (priceTrend === "UP" && cmfValue < 0) {
      return "BEARISH_DIVERGENCE"; // السعر يصعد لكن السيولة تخرج (فخ شراء)
    } else if (priceTrend === "DOWN" && cmfValue > 0) {
      return "BULLISH_DIVERGENCE"; // السعر يهبط لكن السيولة تدخل (فخ بيع - تجميع)
    }
    return "NEUTRAL";
  }
}