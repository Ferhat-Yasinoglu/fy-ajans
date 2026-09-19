# studio/ — Claude ile üretilen içerik

Kursun 6. bölümünün («Vitrin») canlı örneği. Her dosya bir kampanya: `/icerik-uret` skill'i
(`.claude/skills/icerik-uret/SKILL.md`) bir bölümün gerçek metnini alır, beş Instagram gönderisi,
bir reel senaryosu, bir carousel ve bir DM yanıt şablonu üretir. Kaynak sayfada olmayan hiçbir vaat
ya da rakam yazılmaz; marka sesi worker'daki FYOS sistem promptuyla aynıdır.

Sahnedeki «Studio · N posts» kartı `data/fy-stats.json` içindeki `studio` sayısından okur; sayı buradaki
kampanya dosyalarının sayısıdır. Görsel ve video burada üretilmez — senaryo verilir, çekim sahibinindir.
