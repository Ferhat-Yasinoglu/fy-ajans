---
name: icerik-uret
description: Kursun bir bölümünü (ya da sitedeki bir sayfayı) Instagram kampanyasına çevirir — beş gönderi metni, bir reel senaryosu, bir carousel, bir DM yanıt şablonu — ve studio/ klasörüne yazar. «İçerik üret», «Instagram», «reel», «carousel», «kampanya», «gönderi yaz» dendiğinde kullan.
---
## Girdi
Bölüm numarası (`course/chapter-N.html`) ya da bir sayfa yolu; isteğe bağlı dil (varsayılan TR; DE/EN/FA
istenirse aynı yapıda). Kaynak her zaman sitedeki gerçek metindir: bölümün «Bu bölümün sonunda» listesi,
başlıkları ve «Şimdi yap» görevleri. **Sayfada olmayan bir vaat, rakam ya da sonuç üretilmez.**

## Adımlar
1. Kaynağı oku: `course/chapter-N.html` içindeki `<h2>/<h3>` başlıkları, «Bu bölümün sonunda» maddeleri,
   «Şimdi yap» görevleri. Bunlardan **en somut 5 fikri** seç — her biri tek başına bir gönderi olabilmeli
   (bir alışkanlık, bir cümle, bir küçük deney).
2. Marka sesi (worker `SYSTEM_PROMPT` ile aynı): sıcak, «sen» diliyle, kısa cümle, abartı yok. Emoji en
   fazla bir tane ve yalnızca gerekiyorsa; büyük harfle bağırma yok. Kurs şu an ücretsiz — «ücretsiz»
   denir, «ileride ücretli olabilir» eklenmez (gönderide yer yok), ama «sınırlı süre» gibi baskı da yok.
   Fiyat sorulursa «projeye göre». Kurucu adı Farhad Yaqoobi. Instagram: @farhad___yaqoobi.
3. Her gönderi üç parça: **kanca** (ilk satır, «daha fazla»dan önce görünen 8–12 kelime; soru ya da
   ters köşe, ama içerikte olmayanı vaat etmez — bölüm 6'nın «dürüst kanca» kuralı), **değer** (3–6 kısa
   satır, bir şeyi gerçekten öğretir; okuyan uygulayabilmeli), **çağrı** (tek eylem: «Bölüm 1 profildeki
   bağlantıda» ya da «Yorumla: …»). Sonda 4–5 niş etiket; genel #ai #tech yığını yok.
4. Reel senaryosu 30–45 saniye: sahne sahne (saniye · görüntü · ekran yazısı · söz). İlk 3 saniyede
   kanca, sonda tek çağrı. Görüntü önerileri çekilebilir olmalı (ekran kaydı, eller, yüz, önce–sonra).
5. Carousel 7 kart: 1 kanca, 5 içerik, 7 çağrı. Her kartta en fazla 15 kelime.
6. DM yanıt şablonu: bölümün konusuyla ilgili mesaj gelince ilk yanıt (aynı gün, sıcak, tek soru sorar,
   bağlantı verir). Bölüm 6'nın kuralı: karşılama otomatik, cevap insan, aynı gün.
7. Dosyaya yaz: `studio/YYYY-MM-DD-bolum-N.md` (ön bilgi: bölüm, dil, tarih, kaynak). Aynı bölümün
   ikinci kampanyası `-2` eki alır. `studio/README.md` klasörün ne olduğunu anlatır; oraya dokunma.
8. `node tools/fy-stats.mjs` çalıştır: `data/fy-stats.json` içindeki `studio` sayısını (ve öbür sayılan
   kartları) depodan yeniden sayar. Sahnedeki «Studio · N posts» kartı buradan okur; elle yazma.
9. Çıktıyı kullanıcıya göstermeden önce kontrol: sayfada olmayan bir iddia var mı? Rakam uydurulmuş mu?
   Her gönderinin çağrısı tek mi? Kanca içeriği karşılıyor mu? Emoji ≤ 1?

## Ne değildir
- Görsel ya da video üretmez; çekim ve kurgu için senaryo verir (bölüm 6, kurgu bölümü).
- Paylaşmaz, planlamaz; dosya üretir. Yayın kararı ve zamanlaması sahibinindir.
- Sahnedeki sayı dışında siteye dokunmaz.
