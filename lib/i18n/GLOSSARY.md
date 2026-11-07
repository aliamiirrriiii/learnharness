# Persian UI glossary (teeez fork)

How the app's words are put in Persian, so every screen says the same thing.
The voice follows teeez's copy guide: professional, natural written Persian;
complete written verbs («انتخاب کنید», «می‌شود»); short familiar buttons;
literal wording for errors, costs and anything destructive.

## Writing rules

- Half-space (U+200C) wherever Persian needs it: «می‌شود», «نمی‌توان»,
  «درس‌ها», «نقشه‌ای», «آماده‌سازی», «یادگرفته‌اید». Never a plain space there,
  never nothing.
- Persian «ی» (U+06CC) and «ک» (U+06A9), never Arabic «ي» or «ك». The coverage
  test refuses them.
- Persian punctuation: «،» «؛» «؟», and «» for quotation marks.
- No digits typed into a string: a number goes through a placeholder,
  t("{n} sources", { n }), and comes out in Persian digits.
- Keep a placeholder exactly as the English has it: `{name}` stays `{name}`.
- Product and model names (LearnHarness, Mermaid, PDF, SVG, Markdown, model
  ids) stay in Latin.
- Keyboard keys (Enter, Esc, Shift, ⌘) stay as written; their descriptions are
  translated.

## Terms

| English | Persian |
| --- | --- |
| session (a teaching or practice chat) | جلسه |
| teaching session / lesson | جلسهٔ درس / درس |
| practice / practice session | تمرین / جلسهٔ تمرین |
| problem (in practice) | مسئله |
| knowledge graph, Graph (the view) | نقشهٔ دانش |
| proposition | گزاره |
| node (a proposition in the graph) | گزاره; «گره» only in the drawing settings (Node size), where it means the dot |
| chain, reasoning chain | زنجیرهٔ استدلال |
| premise / conclusion | مقدمه / نتیجه |
| source | منبع |
| notes / import notes | یادداشت‌ها / وارد کردن یادداشت‌ها |
| cluster | خوشه |
| extraction | استخراج |
| coverage | پوشش |
| plan (the lesson's dependency map) | برنامهٔ درس |
| step / node (in the plan) | گام |
| goal | هدف |
| tutor, teacher | آموزگار |
| prober (measures understanding before teaching) | سنجشگر |
| probe (the measuring phase) | سنجش |
| quiz / question | پرسش |
| multiple choice / free recall | چندگزینه‌ای / یادآوری آزاد |
| answer / submit | پاسخ / فرستادن |
| hint | راهنمایی |
| confidence | اطمینان |
| your thinking (the thinking field) | فکرتان / استدلالتان |
| explanation | توضیح |
| research (background tool) | پژوهش |
| visual (diagram tool) | تصویر توضیحی |
| demo (interactive demonstration) | نمایش تعاملی |
| job / background work | کار پس‌زمینه |
| steer (a note sent while the agent works) | راهنمایی میان کار |
| model / Strong / Cheap / Vision | مدل / قوی / ارزان / بینایی |
| thinking level | سطح تفکر |
| compaction | فشرده‌سازی |
| context (window) | زمینه |
| cost / usage | هزینه / مصرف |
| tokens | توکن |
| settings / Agent / Appearance / Keyboard | تنظیمات / دستیار / ظاهر / صفحه‌کلید |
| tools | ابزارها |
| prompt (system prompt) | پرامپت |
| attach / attachment / upload | پیوست / پیوست / بارگذاری |
| search / find | جستجو / یافتن |
| new session | جلسهٔ تازه |
| delete / remove | حذف / برداشتن |
| cancel / close | انصراف / بستن |
| save / saved | ذخیره / ذخیره شد |
| stop / abort | توقف |
| retry | تلاش دوباره |
| rename | تغییر نام |
| loading… | در حال بارگذاری… |
| error | خطا |
