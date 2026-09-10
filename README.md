# SMC Kâğıt Üzerinde İşlem Simülatörü

Sunucu tarafındaki API rotası üzerinden **Binance Spot REST API canlı mumlarını** inceleyen, buluta dağıtıma hazır küçük bir panel. Yalnızca simülasyon analizi yapar; borsaya bağlanmaz ve canlı emir göndermez.

## Dahil edilen SMC göstergeleri

- onaylanmış swing tepe ve dipleri;
- break of structure (BOS) ve change of character (CHoCH);
- üç mumlu yükseliş/düşüş fair value gap (FVG) bölgeleri;
- eşit tepe/dip (BSL/SSL) ve likidite süpürmeleri;
- yapı kırılımından önceki karşıt mumdan türetilen order block bölgeleri; ve
- son yapı olayı ile FVG aynı yönü gösterdiğinde nötr/yükseliş/düşüş simülasyon sinyali.

Bu eğitim amaçlı bir teknik analiz uygulamasıdır, yatırım tavsiyesi değildir. SMC etiketleri `public/smc.js` içinde belirlenmiş kurallardır; kurumsal işlem aktivitesine dair bir iddia değildir.

## Yerelde çalıştırma

```bash
npm test
npm start
```

`http://localhost:3000` adresini açın. Sunucu, `/api/candles` üzerinden `https://api.binance.com/api/v3/klines` çağrısını yapar; tarayıcıların veri sağlayıcıya doğrudan erişmesi gerekmez. Uygulamanın çalıştığı sunucu Binance'a giden HTTPS trafiğine izin vermelidir.

## Buluta dağıtım

Üretim bağımlılığı yoktur ve `npm start` ile başlar. Barındırma sağlayıcısı gerektiriyorsa `PORT` ortam değişkenini ayarlayın. Node.js 20+ destekleyen her web barındırıcısı (örneğin Render, Railway veya container platformu) çalıştırabilir. Uygulamayı herkese açık yapmadan önce `/api/candles` için kimlik doğrulama ve hız sınırlaması ekleyin.

## API

`GET /api/candles?symbol=BTCUSDT&interval=15m&limit=300`

Semboller büyük harfli alfanümerik Binance spot sembolleriyle sınırlıdır; zaman aralığı izin listesindedir ve mum sayısı 50–1000 olmalıdır. Yanıt, indikatör motoruna uygun normalize edilmiş OHLCV mumlarını içerir.
