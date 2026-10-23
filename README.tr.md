# prompt-lint
[![CI](https://github.com/YusufBeratZengin/prompt-lint/actions/workflows/ci.yml/badge.svg)](https://github.com/YusufBeratZengin/prompt-lint/actions/workflows/ci.yml) [![npm](https://img.shields.io/npm/v/prompt-lint)](https://www.npmjs.com/package/prompt-lint) [![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE) [![Node.js](https://img.shields.io/badge/node-%3E%3D20-green.svg)](package.json)
[English](README.md) | [Türkçe](README.tr.md)

LLM prompt'larını ve `CLAUDE.md`, `AGENTS.md`, `.cursorrules` gibi ajan talimatlarını yerel olarak, çevrim dışı ve ek bağımlılık olmadan denetleyen bir linter.

![Gerçek prompt-lint çıktısını ve 11 sorunluk özeti gösteren terminal demosu](docs/demo.svg)

## Neden prompt-lint?

- API anahtarı, ağ isteği veya çalışma zamanı bağımlılığı gerektirmeden on üç deterministik kuralı yerel olarak çalıştırır.
- Çelişkileri, tekrarları, unutulmuş şablon değişkenlerini, bozuk bağlantıları ve açıkta kalan sırları tek taramada bulur.
- Aynı denetimleri terminalde, ESM kodunda ve CI ortamında kullanabilir; JSON veya SARIF çıktısı alabilirsiniz.

## Hızlı başlangıç

Node.js 20 veya üzeri ve Git gerekir. Paket kurmadan doğrudan kaynak koddan çalıştırın:

```bash
git clone https://github.com/YusufBeratZengin/prompt-lint.git
cd prompt-lint
node bin/prompt-lint.js --no-color test/fixtures/clean/CLAUDE.md
```

Temiz örnek, `No problems found` mesajını verir ve 0 çıkış koduyla tamamlanır. Bulguları görmek için aşağıdaki demoyu çalıştırın; bilerek hatalı hazırlanmış bu dosya 1 çıkış koduyla sonlanır.

<details>
<summary>Demo komutu ve terminal çıktısının tamamı</summary>

```text
$ node bin/prompt-lint.js --no-color test/fixtures/dirty/bloated.md

test/fixtures/dirty/bloated.md (~211 tokens, 107 words)
  3:1    warning  Heading depth (5) exceeds recommended maximum depth of 4. Flatten hierarchy to improve LLM instruction retrieval.  PL011
  5:1    warning  Excessive ALL-CAPS text detected ("DO NOT EVER FORGET TO FOLLOW INSTRUCTIONS PROMP..."). Models do not require shouting; use precise phrasing instead.  PL005
  8:1    warning  Line is duplicate or near-duplicate (80% similarity) of line 7: "Always use TypeScript for all files in this rep...".  PL002
  8:1    error    Conflicting directive on line 8 ("Never use TypeScript for all files in this repository") contradicts line 7 ("Always use TypeScript for all files in this repository").  PL003
  10:8   warning  Vague directive "be careful" lacks actionable criteria. Replace with testable constraints or explicit rules.  PL004
  10:23  warning  Vague directive "do your best" lacks actionable criteria. Replace with testable constraints or explicit rules.  PL004
  12:42  warning  Excessive emphasis marker "!!!" detected. Multiple punctuation marks do not improve model adherence.  PL006
  16:36  error    Unresolved template placeholder "{{user_token}}" detected. Replace with actual value before deployment.  PL007
  17:10  error    Unresolved placeholder tag "<TODO: finish docs>" detected.  PL007
  19:10  error    Referenced relative file "./non-existent-documentation-file.md" does not exist on disk.  PL008
  25:1   warning  Line is duplicate or near-duplicate (100% similarity) of line 24: "This is duplicate instruction content that repe...".  PL002

✖ 11 problems (4 errors, 7 warnings)
```

</details>

## Kurulum

Npm üzerinden yayımlanan bir sürümü projenize kurmak için:

```bash
npm install --save-dev prompt-lint
```

Kurulumdan sonra `npx prompt-lint` ile çalıştırın. Aşağıdaki komutlar kaynak kod deposunda `node bin/prompt-lint.js` kullanır; başka bir projede bu kısmı `npx prompt-lint` ile değiştirin.

## Kullanım örnekleri

### CLI

Dosya belirtmezseniz linter, talimat ve prompt dosyalarını alt dizinlerde de arar. Doğrudan dosya yolu verdiğinizde, dosya otomatik taramada hariç tutulsa bile denetlenir.

```bash
node bin/prompt-lint.js
node bin/prompt-lint.js CLAUDE.md AGENTS.md
node bin/prompt-lint.js --format json CLAUDE.md
node bin/prompt-lint.js --format sarif CLAUDE.md
```

Terminal metni, JSON ve SARIF v2.1.0 çıktısı üretir. Renk kullanımı TTY durumuna, `NO_COLOR` ve `FORCE_COLOR` değişkenlerine bağlıdır. `--no-color` renkleri kapatır.

### Standart girdi

```bash
printf 'Run unit tests.\n' | node bin/prompt-lint.js --stdin --stdin-filename system.prompt
```

### API

ESM API; yapılandırma, dosya tarama, kural ve çıktı biçimlendirme yardımcılarını da dışa aktarır. `lintText`, yapılandırma verilmedikçe yerleşik varsayılanları kullanır. Dosyadaki yapılandırmayı okumak için `loadConfig` çağırın.

```javascript
import { lintText, lintFiles, estimateTokens } from "prompt-lint";

console.log(estimateTokens("Run unit tests before committing."));
const result = lintText("Always use TypeScript.\nNever use TypeScript.");
console.log(result.diagnostics);
const files = await lintFiles(["CLAUDE.md", "AGENTS.md"]);
```

### Seçenekler

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

## Çıkış kodları

| Kod | Anlamı |
| --- | --- |
| `0` | Hata yok; uyarı sayısı belirlenen sınırı aşmıyor. Varsayılan olarak uyarı sınırı yoktur. |
| `1` | Lint hatası var, uyarı sınırı aşıldı veya açıkça belirtilen hedeflerle eşleşen dosya bulunamadı. |
| `2` | Komut kullanımı veya yapılandırma hatalı. |

`--max-warnings 0`, tek bir uyarıda bile başarısız olur. `--quiet` uyarıları raporda gizler; uyarı sınırı uygulanmaya devam eder.

## Kurallar

| Kural Kimliği | Kural Adı | Kategori | Varsayılan Seviye | Açıklama |
| --- | --- | --- | --- | --- |
| `PL001` | `token-budget` | Bütçe | `warning` | Tahmini token sayısı belirlenen bütçeyi aşan dosyaları uyarır. |
| `PL002` | `duplicate-content` | Fazlalık | `warning` | Jaccard benzerliğiyle tekrar eden veya birbirine çok benzeyen satırları bulur. |
| `PL003` | `contradictory-directives` | Mantık | `error` | Nesnesi ve koşulu aynı olan karşıt İngilizce yönergeleri tespit eder. |
| `PL004` | `vague-directive` | Açıklık | `warning` | "Be careful", "do your best" veya "ensure high quality" gibi ölçülemez ve belirsiz yönergeleri tespit eder. |
| `PL005` | `shouting-density` | Biçim | `warning` | Modele bağıran aşırı BÜYÜK HARFLİ kelime yoğunluğunu belirler. Standart kısaltmaları hariç tutar. |
| `PL006` | `excessive-emphasis` | Biçim | `warning` | Tekrarlanan noktalama işaretlerini (`!!!`, `???`) veya iç içe kalın-italik vurguları tespit eder. |
| `PL007` | `unresolved-placeholder` | Bütünlük | `error` | Unutulmuş şablon değişkenlerini (`{{var}}`, `<TODO>`, `TBD`, `[INSERT_...]`) tespit eder. |
| `PL008` | `broken-relative-link` | Bütünlük | `error` | Ters tırnak veya bağlantı içinde belirtilen göreceli dosya yollarının diskte bulunup bulunmadığını denetler. |
| `PL009` | `exposed-secret` | Güvenlik | `error` | API anahtarlarını, erişim belirteçlerini veya gizli anahtarları tespit eder ve maskeleyerek raporlar. |
| `PL010` | `long-paragraph` | Açıklık | `warning` | Aşırı uzun satırları veya paragraf sonu olmadan devam eden yoğun metin bloklarını tespit eder. |
| `PL011` | `excessive-heading-depth` | Biçim | `warning` | Başlık derinliği 4'ten büyük olan (`#####` ve `######`) parçalanmış başlıkları tespit eder. |
| `PL012` | `list-item-verb` | Biçim | `off` | Liste maddelerinin etken bir eylem fiiliyle başlamasını denetler. (İsteğe bağlı, varsayılan kapalı). |
| `PL013` | `section-token-budget` | Bütçe | `warning` | Tahmini 1.000 token sınırını aşan bölümleri bildirir; eşik `options.PL013.maxTokens` ile ayarlanır. |

Her kuralın gerekçesi, kötü/iyi örnekleri, seçenekleri ve sınırlamaları [tam kural başvurusunda](docs/rules.md) bulunur. PL003 çelişkili talimatları zaten denetler. PL008 eksik dosya ve dizin referanslarını; Windows yollarını ve ters tırnak içindeki tek dosya adlarını da denetler.

## Örnekler

[CLAUDE.bad.md](examples/CLAUDE.bad.md) ve [CLAUDE.good.md](examples/CLAUDE.good.md) dosyalarını [örnek yapılandırmayla](examples/.promptlintrc.json) karşılaştırın. İlk komut 1, ikinci komut 0 çıkış koduyla tamamlanır.

```bash
node bin/prompt-lint.js --config examples/.promptlintrc.json examples/CLAUDE.bad.md
node bin/prompt-lint.js --config examples/.promptlintrc.json examples/CLAUDE.good.md
```

```text
$ node bin/prompt-lint.js --no-color --config examples/.promptlintrc.json examples/CLAUDE.bad.md

examples/CLAUDE.bad.md (~30 tokens, 10 words)
  4:1   error    Conflicting directive on line 4 ("Never use TypeScript") contradicts line 3 ("Always use TypeScript").  PL003
  6:1   warning  Vague directive "Be careful" lacks actionable criteria. Replace with testable constraints or explicit rules.  PL004
  6:11  warning  Excessive emphasis marker "!!!" detected. Multiple punctuation marks do not improve model adherence.  PL006

✖ 3 problems (1 error, 2 warnings)
```

## Yapılandırma

Çalışma dizininde sırasıyla `.promptlintrc.json`, `.promptlintrc` ve `package.json` içindeki `promptlint` alanı aranır. Belirli bir dosyayı kullanmak için `--config` verin.

```json
{
  "$schema": "https://raw.githubusercontent.com/YusufBeratZengin/prompt-lint/main/schema.json",
  "budget": { "maxTokens": 2000 },
  "rules": { "PL003": "error", "PL012": "off" },
  "options": {
    "PL002": { "threshold": 0.8, "minWords": 4 },
    "PL013": { "maxTokens": 1000 }
  },
  "ignore": ["generated/**"]
}
```

[JSON Schema](schema.json), editörde yapılandırma denetimi sağlar. Tanınmayan üst düzey alanlar, kural kimlikleri ve geçersiz önem seviyeleri 2 çıkış koduyla reddedilir. Hata mesajı dosyayı ve sorunlu alanı belirtir. Kural kimlikleri ve önem seviyelerinde büyük/küçük harf ayrımı yapılmaz. Seviyeler `off`, `info`, `warning` ve `error` değerleridir. Eski gösterimdeki `0`/`false`, `1` ve `2`/`true` sırasıyla kapalı, uyarı ve hata anlamına gelir. Hariç tutma desenleri varsayılan listeye eklenir.

## Nasıl çalışır?

Linter, Markdown satırlarını ayrıştırır, token sayısını tahmin eder, on üç deterministik kuralı çalıştırır ve bulguları raporlar. Kurallar ağ isteği yapmaz. PL003, karşıt İngilizce yönergelerin normalleştirilmiş nesneleri ve koşul ekleri aynıysa çelişki bildirir; iki yönergede de koşul bulunmaması da buna dahildir. Farklı koşulları raporlamaz. Eski `threshold` seçeneği kabul edilir ancak bu birebir eşleşme yöntemini artık etkilemez. PL013, her başlığın gövdesini herhangi bir derinlikteki sonraki başlığa kadar sayar; kod blokları da bütçeye dahildir. İlk başlıktan önceki metin ayrı bir bölümdür. Dosya bütçesi PL001'den bağımsızdır.

## Sık sorulan sorular ve sınırlamalar

### Analiz sırasında prompt'lar bir servise gönderiliyor mu?

Analiz yerel olarak çalışır; prompt'lar dışarı gönderilmez. Sır bildirimlerinde eşleşen değer maskelenir ancak raporda başka prompt metinleri ve dosya yolları bulunabilir. Paylaşmadan önce raporu gözden geçirin.

### Token sayıları kesin mi, hangi diller destekleniyor?

Token sayıları sezgisel tahminlerdir; araç bir tokenizer değildir. Doğruluk metne ve modele göre değişir. Kesin bütçe için hedef modelin tokenizer'ını kullanın. Statik kurallar anlam düzeyindeki çelişkileri kaçırabilir veya geçerli talimatları işaretleyebilir. Dile bağlı kurallar ağırlıklı olarak İngilizceyi tanır.

### Npm paketi bulamazsa aracı kullanabilir miyim?

Evet. [Hızlı başlangıç](#hızlı-başlangıç), kaynak kodu kullanır ve paket kurulumu gerektirmez. Npm rozeti kayıt sistemindeki durumu yansıtır; paket yayımlanmadan önce sürüm bilgisi görünmeyebilir.

### Demo neden 1 çıkış koduyla sonlanıyor?

Demo dosyası bilerek lint hataları içerir. Kurulumu doğrulamak için temiz örneği kullanın. CI davranışı ve uyarı sınırları için [Çıkış kodları](#çıkış-kodları) bölümüne bakın.

## GitHub Action

Deponuzu checkout ettikten sonra composite Action'ı doğrudan kaynak koddan kullanın. Node.js 22 kurulur; npm kurulumu gerekmez. Sürüm yayımlanmadan önce `@main` kullanılabilir; tekrarlanabilir derlemeler için incelenmiş bir commit SHA'sına sabitleyin. Action kaynak dosyalarınızı değiştirmez; raporlar runner'ın geçici dizinine yazılır.

```yaml
name: Prompt quality
on: [push, pull_request]
permissions:
  contents: read
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: YusufBeratZengin/prompt-lint@main
        with:
          paths: |
            AGENTS.md
            prompts/**/*.prompt.md
          fail-on: warning
```

| Girdi | Varsayılan | Anlamı |
| --- | --- | --- |
| `paths` | Boş | Checkout dizinine göre her satırda bir dosya, dizin veya glob. Boşsa otomatik tarama yapılır. Yol içindeki boşluklar korunur; kabuk tırnaklaması gerekmez. |
| `config` | Boş | Checkout dizinine göre JSON yapılandırma yolu. Boşsa normal yapılandırma araması yapılır. |
| `format` | `stylish` | `stylish`, `json` veya `sarif`. |
| `fail-on` | `error` | `error` hatalarda; `warning` uyarı veya hatalarda başarısız olur. `none` bulguları raporlayıp başarılı sayılır. |

Yapılandırma, okunamayan dosya ve hedef bulma hataları `fail-on: none` seçildiğinde de başarısız olur. Çıktılar: `report` raporun tam yolu, `exit-code` ise ilk lint çıkış kodudur. Bulgular adımı başarısız kılsa da rapor kullanılabilir. Otomatik taramada dosya bulunmazsa boş bir yapılandırılmış rapor üretilir. Açıkça belirtilen hedeflerle hiçbir dosya eşleşmezse başarısız olur. Yollar kabukta çalıştırılmaz, veri olarak geçirilir. [Öz sınama iş akışı](.github/workflows/action-test.yml), Linux ve Windows'u kapsar ve SARIF'i OASIS şemasına göre doğrular.

## GitHub code scanning (SARIF)

Bu iş akışını code scanning etkin olan depolarda kullanın. Yükleme adımına `security-events: write` izni verir; lint bulguları önceki adımı başarısız kılsa bile raporu yükler:

```yaml
name: Prompt code scanning
on: [push, pull_request]
permissions:
  contents: read
  security-events: write
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: YusufBeratZengin/prompt-lint@main
        id: lint
        with:
          format: sarif
          fail-on: error
      - uses: github/codeql-action/upload-sarif@v4
        if: ${{ !cancelled() && steps.lint.outputs.report != '' }}
        with:
          sarif_file: ${{ steps.lint.outputs.report }}
          category: prompt-lint
```

SARIF v2.1.0 çıktısı depo köküne göre URI kodlanmış yolları, açıkça tanımlanmış kaynak kökünü, eşleşen kural indekslerini ve UTF-16 sütunlarını kullanır. Yükleme action'ı checkout edilmiş kaynaklardan parmak izi üretebilir. [GitHub SARIF gereksinimlerine](https://docs.github.com/en/code-security/reference/code-scanning/sarif-files/sarif-support) bakın. Depo izinleri ve fork pull request politikaları yüklemeyi sınırlayabilir. Analiz yerelde kalır; rapor yüklemek tanı metinlerini ve yolları GitHub'a gönderir. Talimatlarda özel veri varsa yerel raporları kullanın.

## pre-commit framework

Projenizin `.pre-commit-config.yaml` dosyasına aşağıdakini ekleyin. Framework, hook'u `language: node` ile kaynak koddan kurar; yayımlanmış npm paketi gerekmez. Sürüm yayımlanmadan önce `rev: main` kullanılabilir; tekrarlanabilirlik için incelenmiş bir commit SHA'sına sabitleyin.

```yaml
repos:
  - repo: https://github.com/YusufBeratZengin/prompt-lint
    rev: main
    hooks:
      - id: prompt-lint
```

[pre-commit](https://pre-commit.com/) kurulu olduğunda çalıştırın:

```bash
pre-commit install
pre-commit run prompt-lint --all-files
```

Hook, Cursor `.mdc` kuralları dahil değişen talimat/prompt dosyalarını denetler; uyarı veya hatalarda başarısız olur. Node.js 20 veya üzeri gerekir; pre-commit Node ortamını yönetir, `language_version` ile belirli bir uyumlu sürüm seçilebilir. Yapılandırma projenizden okunur. Ek dosya adlarını denetlemek için hook'un `files` regex'ini değiştirin. Uyarılara izin vermek için `args: [--]`; yapılandırma seçmek için `args: [--config, .promptlintrc.json, --max-warnings, '0', --]` kullanın.

### Düz Git hook'u

Kaynak kod deposunda bu betiği `.git/hooks/pre-commit` dosyasına koyun. POSIX sistemlerde çalıştırma izni verin. Betik, çalışma ağacındaki talimat dosyalarını denetler. Başka bir projede yukarıdaki geliştirme bağımlılığını kurup komutu `npx --no-install prompt-lint --max-warnings 0` olarak değiştirin.

```sh
#!/bin/sh
node bin/prompt-lint.js --max-warnings 0 || exit 1
```

## Geliştirme

Kaynak kod deposunda:

```bash
npm ci
npm run lint
npm test
npm run demo:check
npm pack --dry-run
```

Testler ağ erişimi olmadan `node:test` ile çalışır. `npm test`, Node.js'in yerleşik satır, dal ve fonksiyon kapsamı raporunu hem terminalde hem CI çıktısında gösterir. CI, Windows ve Linux üzerinde Node.js 20, 22 ve 24 sürümlerini kapsar. CodeQL, JavaScript kodunu push ve pull request olaylarında ve haftalık olarak analiz eder.

Terminal görselini `npm run demo` ile yeniden üretin. `npm run demo:check`, depodaki görselin güncel CLI çıktısıyla eşleştiğini doğrular. Proje JavaScript kullanır; ayrı bir tür denetimi komutu yoktur.

## Katkıda bulunma

Kurulum, kural geliştirme, commit biçimi ve yayın adımları [CONTRIBUTING.md](CONTRIBUTING.md) dosyasındadır. Güvenlik açıklarını [SECURITY.md](SECURITY.md) üzerinden özel olarak bildirin. Toplulukta [davranış kuralları](CODE_OF_CONDUCT.md) geçerlidir.

## Lisans

[MIT](LICENSE). Telif hakkı (c) 2026 Yusuf Berat Zengin.
