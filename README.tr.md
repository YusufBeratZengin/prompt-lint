# prompt-lint

Büyük Dil Modeli (LLM) sistem istemleri ve ajan talimat dosyaları (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `.prompt`, `.prompt.md` ve sistem istemi şablonları) için statik analiz denetleyicisi (linter).

Yazılım geliştirme ekipleri yapay zekâ kodlama ajanlarını benimsedikçe, ajan talimat dosyaları zamanla şişer, birbiriyle çelişen yönergelerle dolar ve token bütçelerini tüketerek modelin talimatlara uyumunu zayıflatır. `prompt-lint`, hiçbir harici çalışma zamanı bağımlılığı (zero runtime dependencies) olmadan, açıklanabilir statik kurallarla istem dosyalarının temiz, net ve deterministik kalmasını sağlar.

[English Documentation](README.md)

---

## Özellikler

- Sıfır çalışma zamanı bağımlılığı: Tamamen yerleşik Node.js standart kütüphaneleriyle geliştirilmiştir.
- Yüksek performanslı token tahmincisi: Harici ağırlık veya C++ derlemesi gerektirmeden BPE tokenizer davranışını yaklaşık %5-10 hata payıyla simüle eden alt kelime, unicode ve boşluk sezgiseli.
- 12 adet açıklanabilir kural: Token bütçesi aşımı, tekrarlanan satırlar, çelişkili yönergeler, bağırma (BÜYÜK HARF yoğunluğu), belirsiz ifadeler, çözülmemiş yer tutucular, kırık göreceli bağlantılar ve açıkta kalan sırlar.
- Çoklu çıktı biçimleri: ANSI renkleri ve `NO_COLOR` uyumlu terminal çıktısı, JSON ve GitHub Code Scanning ile tam uyumlu OASIS SARIF v2.1.0 formatı.
- `.promptlintrc.json` ile yapılandırma: Kural önem seviyeleri (`off`, `info`, `warning`, `error`) ve kural parametreleri kontrolü.
- Programatik API: Kendi derleme ve test hatlarınıza kolayca dahil edilebilir ESM arayüzü.

---

## Kurulum

`prompt-lint`, Node.js sürüm 20.0.0 veya üzerini gerektirir.

Genel (global) kurulum:
```bash
npm install -g prompt-lint
```

Veya `npx` ile doğrudan çalıştırma:
```bash
npx prompt-lint
```

Veya geliştirme bağımlılığı olarak ekleme:
```bash
npm install --save-dev prompt-lint
```

---

## CLI Kullanımı

### Otomatik Keşif
Herhangi bir dosya argümanı verilmediğinde, `prompt-lint` projenizdeki standart ajan ve istem dosyalarını otomatik olarak tarar (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `.cursor/rules/*.mdc`, `**/*.prompt`, `**/*.prompt.md`, `**/system*.md`, `**/system*.txt`):

```bash
prompt-lint
```

### Belirli Dosyaları Tarama
Belirli dosya veya dizin yollarını argüman olarak iletebilirsiniz:

```bash
prompt-lint CLAUDE.md AGENTS.md
prompt-lint "prompts/**/*.md"
```

### Standart Girdi (stdin)
Boru hattı (pipe) üzerinden gelen istem metinlerini analiz edebilirsiniz:

```bash
cat system.prompt | prompt-lint --stdin --stdin-filename system.prompt
```

### Çıktı Formatları

#### Terminal (Varsayılan)
```bash
prompt-lint
```

#### JSON Çıktısı
```bash
prompt-lint --format json > rapor.json
```

#### SARIF (GitHub Code Scanning)
```bash
prompt-lint --format sarif > sonuclar.sarif
```

### Komut Satırı Seçenekleri

| Seçenek | Kısa Kod | Açıklama | Varsayılan |
| --- | --- | --- | --- |
| `--format <format>` | `-f` | Çıktı biçimi: `stylish`, `json`, `sarif` | `stylish` |
| `--config <path>` | `-c` | Özel JSON yapılandırma dosyası yolu | Otomatik bulunur |
| `--max-tokens <count>` | | PL001 kuralı için token bütçesi eşiği | `2000` |
| `--max-warnings <count>` | | Uyarı sayısı eşiği aşarsa 1 çıkış kodu ile sonlanır | `-1` (devre dışı) |
| `--quiet` | `-q` | Yalnızca hataları gösterir, uyarıları gizler | `false` |
| `--rule <id>=<sev>` | | Kural önem seviyesini geçersiz kılar (`off`, `info`, `warning`, `error`) | Yok |
| `--ignore <pattern>` | | Taramadan hariç tutulacak glob deseni | Yok |
| `--stdin` | | İstem içeriğini standart girdiden okur | `false` |
| `--stdin-filename <name>` | | `--stdin` kullanıldığında görüntülenecek dosya etiketi | `<stdin>` |
| `--no-color` | | ANSI terminal renklendirmesini kapatır | `false` |
| `--version` | `-v` | Paket sürümünü görüntüler | |
| `--help` | `-h` | Yardım metnini görüntüler | |

---

## Kural Tablosu

Her kural benzersiz bir kimliğe (`PL001` - `PL012`), varsayılan önem derecesine ve yapılandırılabilir seçeneklere sahiptir.

| Kural Kimliği | Kural Adı | Kategori | Varsayılan Seviye | Açıklama |
| --- | --- | --- | --- | --- |
| `PL001` | `token-budget` | Bütçe | `warning` | Tahmini token sayısı belirlenen bütçeyi aşan dosyaları uyarır. |
| `PL002` | `duplicate-content` | Fazlalık | `warning` | Normalleştirilmiş n-gram shingles ve Jaccard benzerliği ile mükerrer veya çok yakın satırları tespit eder. |
| `PL003` | `contradictory-directives` | Mantık | `error` | Aynı hedef üzerinde çelişen talimatları ("her zaman X yap" ile "asla X yapma") tespit eder. |
| `PL004` | `vague-directive` | Açıklık | `warning` | "Be careful", "do your best" veya "ensure high quality" gibi ölçülemez ve belirsiz yönergeleri tespit eder. |
| `PL005` | `shouting-density` | Biçim | `warning` | Modele bağıran aşırı BÜYÜK HARFLİ kelime yoğunluğunu belirler. Standart kısaltmaları hariç tutar. |
| `PL006` | `excessive-emphasis` | Biçim | `warning` | Tekrarlanan noktalama işaretlerini (`!!!`, `???`) veya iç içe kalın-italik vurguları tespit eder. |
| `PL007` | `unresolved-placeholder` | Bütünlük | `error` | Unutulmuş şablon değişkenlerini (`{{var}}`, `<TODO>`, `TBD`, `[INSERT_...]`) tespit eder. |
| `PL008` | `broken-relative-link` | Bütünlük | `error` | Ters tırnak veya bağlantı içinde belirtilen göreceli dosya yollarının diskte bulunup bulunmadığını denetler. |
| `PL009` | `exposed-secret` | Güvenlik | `error` | API anahtarlarını, erişim belirteçlerini veya gizli anahtarları tespit eder ve maskeleyerek raporlar. |
| `PL010` | `long-paragraph` | Açıklık | `warning` | Aşırı uzun satırları veya paragraf sonu olmadan devam eden yoğun metin bloklarını tespit eder. |
| `PL011` | `excessive-heading-depth` | Biçim | `warning` | Başlık derinliği 4'ten büyük olan (`#####` ve `######`) parçalanmış başlıkları tespit eder. |
| `PL012` | `list-item-verb` | Biçim | `off` | Liste maddelerinin etken bir eylem fiiliyle başlamasını denetler. (İsteğe bağlı, varsayılan kapalı). |

---

## Yapılandırma

`prompt-lint`, çalışma dizininde bulunan `.promptlintrc.json` dosyasını veya `package.json` içindeki `"promptlint"` alanını otomatik olarak okur.

Örnek `.promptlintrc.json`:

```json
{
  "budget": {
    "maxTokens": 2000
  },
  "rules": {
    "PL001": "warning",
    "PL002": "warning",
    "PL003": "error",
    "PL004": "warning",
    "PL005": "warning",
    "PL006": "warning",
    "PL007": "error",
    "PL008": "error",
    "PL009": "error",
    "PL010": "warning",
    "PL011": "warning",
    "PL012": "off"
  },
  "options": {
    "PL001": {
      "maxTokens": 2500
    },
    "PL002": {
      "threshold": 0.80,
      "minWords": 4
    },
    "PL010": {
      "maxLineLength": 500,
      "maxParagraphWords": 250
    }
  },
  "ignore": [
    "node_modules/**",
    ".git/**",
    "dist/**",
    "coverage/**"
  ]
}
```

---

## Programatik API

`prompt-lint`, Node.js iş akışlarına entegrasyon için ESM arayüzü sunar:

```javascript
import { lintFile, lintFiles, lintText, estimateTokens } from "prompt-lint";

// Bir metin için token tahmini alma
const stats = estimateTokens("Her zaman dosyaları Prettier ile formatlayın.");
console.log(`Token: ${stats.tokens}, Kelime: ${stats.words}`);

// Ham istem metnini denetleme
const textResult = lintText("Never use TypeScript.\nAlways use TypeScript.");
for (const diag of textResult.diagnostics) {
  console.log(`[${diag.ruleId}] Satır ${diag.line}: ${diag.message}`);
}

// Diskteki dosyaları denetleme
const fileResults = await lintFiles(["CLAUDE.md", "AGENTS.md"]);
```

---

## CI / CD Entegrasyonu

### GitHub Actions İş Akışı

SARIF raporlarını doğrudan GitHub Code Scanning sekmesine yüklemek için iş akışınıza ekleyebilirsiniz:

```yaml
name: Prompt Quality

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-prompts:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Run prompt-lint SARIF
        run: npx prompt-lint --format sarif > results.sarif
        continue-on-error: true

      - name: Upload SARIF to GitHub Code Scanning
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif
```

---

## Lisans

MIT Lisansı. Telif Hakkı (c) 2026 Yusuf Berat Zengin.
Detaylar için [LICENSE](LICENSE) dosyasına bakınız.
