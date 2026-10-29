// המוצרים בסימולטור והאפשרויות שלהם. כל עובדה בטקסטים כאן מופיעה בעמודי המוצר באתר (copy-seo),
// והמספרים שבתוך toSpec הם רק כדי שההדמיה תיראה נכון.
// tip: ההסבר שנפתח בכפתור ה-i. מה שמשפיע על העלות כתוב כמנגנון (יותר חומר, עוד שלב בייצור) ובלי מחירים;
// המשפטים על עלות עוד לא אושרו מול פלומבה (28.10.2026).

const mm = (v) => `${v} מ״מ`;

export const PRODUCTS = {
  pvc: {
    name: 'אותיות PVC',
    lead: 'PVC מוקצף בעובי 6 עד 30 מ״מ, חתוך בכרסומת וצבוע בגוון שתבחרו.',
    tip: 'PVC מוקצף שנצבע בכל גוון, לפנים ולחוץ. בדרך כלל האפשרות החסכונית מבין האותיות.',
    options: [
      { key: 'thick', label: 'עובי', def: 19, tip: ['כמה האות יוצאת מהקיר. אות עבה נראית יותר מהצד ומרחוק, וצורכת יותר חומר, ולכן גם עולה קצת יותר.',
        '10 מ״מ לאותיות קטנות ולשילוב עם הדפסה, 19 מ״מ הוא העובי הנפוץ ללוגו בקבלה, ו-30 מ״מ בולט במיוחד מהצד.'], choices: [
        { v: 10, label: mm(10), hint: 'לאותיות קטנות ולשילוב עם הדפסה' },
        { v: 19, label: mm(19), hint: 'העובי הנפוץ ללוגו בקבלה' },
        { v: 30, label: mm(30), hint: 'לאותיות שבולטות יותר מהקיר' },
      ] },
      { key: 'mount', label: 'התקנה', def: 'flush', tip: ['ישירות על הקיר: האותיות צמודות לקיר, מראה נקי ושטוח.',
        'מרחפת: האותיות במרחק קטן מהקיר ומטילות עליו צל, ולכן נראות עמוקות יותר. ההתקנה קצת יותר מורכבת.'], choices: [
        { v: 'flush', label: 'ישירות על הקיר' },
        { v: 'float', label: 'מרחפת', hint: 'האותיות במרחק קטן מהקיר' },
      ] },
    ],
  },
  alu: {
    name: 'אותיות אלומיניום',
    lead: 'אותיות מלאות בעובי 3 עד 20 מ״מ, או בנויות עם דופן של 2 עד 12 ס״מ.',
    tip: 'מתכת שנחתכת מפלטה מלאה, או נבנית עם דופן שיוצאת מהקיר. לפנים ולחוץ. בדרך כלל יקרה יותר מ-PVC, כי יש בה יותר חומר ויותר עבודה.',
    options: [
      { key: 'build', label: 'סוג', def: 'solid', tip: ['מלאות: נחתכות מפלטת אלומיניום, שטוחות ונקיות.',
        'בנויות: חזית ודופן שמכופפת במכונה, כך שהאות יוצאת מהקיר ויש בה מקום לתאורה. יותר עבודה, ולכן בדרך כלל יקרות יותר.'], choices: [
        { v: 'solid', label: 'אותיות מלאות', hint: 'נקיות ושטוחות, נחתכות מאלומיניום מלא' },
        { v: 'built', label: 'אותיות בנויות', hint: 'חזית ודופן, האות יוצאת מהקיר' },
      ] },
      { key: 'thick', label: 'עובי', def: 10, when: (c) => c.build === 'solid', tip: ['עובי הפלטה שממנה נחתכת האות. פלטה עבה נראית יותר מהצד, שוקלת יותר ועולה יותר.'], choices: [
        { v: 6, label: mm(6) },
        { v: 10, label: mm(10), hint: 'כמו בשלט של חטיבת השרון ברעננה' },
        { v: 20, label: mm(20) },
      ] },
      { key: 'depth', label: 'עומק הדופן', def: 5, when: (c) => c.build === 'built', tip: ['כמה האות יוצאת מהקיר. דופן עמוקה בולטת יותר ונותנת מקום לתאורה, ודורשת יותר חומר. אפשר מ-2 עד 12 ס״מ.'], choices: [
        { v: 3, label: '3 ס״מ' },
        { v: 5, label: '5 ס״מ' },
        { v: 8, label: '8 ס״מ' },
      ] },
      { key: 'finish', label: 'גימור', def: 'brushed', tip: ['מוברש: המתכת עצמה, בלי צבע.',
        'צבעי הלוגו, שחור או זהב: האות מקבלת גוון, וזה עוד שלב בייצור.'], choices: [
        { v: 'brushed', label: 'אלומיניום מוברש' },
        { v: 'paint', label: 'צבעי הלוגו' },
        { v: 'black', label: 'צבוע שחור' },
        { v: 'gold', label: 'גוון זהב' },
      ] },
    ],
  },
  lit: {
    name: 'לוגו מואר',
    lead: 'תאורת לדים בהילה אחורית או בתוך האות, בגוון לבן או צהוב חם.',
    tip: 'אותיות עם לדים, באור שנופל על הקיר או בתוך האות. נראות למרחק ובחושך, וצריך נקודת חשמל ליד השלט. בדרך כלל האפשרות היקרה, כי יש בה גם תאורה וחיווט.',
    options: [
      { key: 'mode', label: 'סוג התאורה', def: 'halo', tip: ['הילה אחורית: האור יוצא מאחורי האות ונופל על הקיר. נפוצה בלובי ועל קירות מעוצבים.',
        'תאורה פנימית: האות כולה מאירה דרך חזית פרספקס ונראית מרחוק, למשל על חזית הבניין. בשתיהן צריך נקודת חשמל ליד השלט.'], choices: [
        { v: 'halo', label: 'הילה אחורית', hint: 'האור נופל על הקיר, והאות נשארת בצבע שלה' },
        { v: 'front', label: 'תאורה פנימית', hint: 'האות כולה מאירה דרך חזית פרספקס' },
      ] },
      { key: 'tone', label: 'גוון האור', def: 'warm', tip: ['החלטה של מראה, ובדרך כלל לא משנה את המחיר. צהוב חם רך ונעים, לבן נקי וחד יותר. הדליקו את מצב ערב כדי להשוות.'], choices: [
        { v: 'warm', label: 'צהוב חם' },
        { v: 'neutral', label: 'לבן' },
      ] },
      { key: 'face', label: 'האות', def: 'paint', when: (c) => c.mode === 'halo', tip: ['הצבע של חזית האות, כשהאור יוצא מאחוריה: בצבעי הלוגו, או אלומיניום מוברש בלי צבע.'], choices: [
        { v: 'paint', label: 'צבעי הלוגו' },
        { v: 'brushed', label: 'אלומיניום מוברש' },
      ] },
      { key: 'sides', label: 'הדופן', def: 'black', when: (c) => c.mode === 'front', tip: ['הדופן היא הצד של האות. שחורה מבליטה את החזית המוארת, ובצבע האות השלט נראה כגוש אחד.'], choices: [
        { v: 'black', label: 'שחורה' },
        { v: 'same', label: 'בצבע האות' },
      ] },
    ],
  },
  glass: {
    name: 'שלט זכוכית בהרחקה',
    lead: 'זכוכית מחוסמת בעובי 4 עד 10 מ״מ, על ברגי הרחקה מכרום ניקל.',
    tip: 'זכוכית מחוסמת עם הלוגו, על ברגים שמרחיקים אותה מהקיר. שלט הכניסה הקלאסי של משרד, ובמעבר משרד מפרקים ארבעה ברגים ולוקחים אותו איתכם.',
    options: [
      { key: 'kind', label: 'זכוכית', def: 'clear', tip: ['שקופה (אקסטרה קליר): בלי הגוון הירקרק של זכוכית רגילה.',
        'חלבית: מותזת חול ולא שקופה, טובה כשהקיר מאחור עמוס. אסיד: גימור מט.'], choices: [
        { v: 'clear', label: 'שקופה, אקסטרה קליר', hint: 'בלי הגוון הירקרק, הלוגו נראה כמו שהוא' },
        { v: 'frosted', label: 'חלבית', hint: 'מותזת חול, מתאימה כשהקיר מאחור עמוס' },
        { v: 'acid', label: 'אסיד', hint: 'גימור מט' },
      ] },
      { key: 'thick', label: 'עובי', def: 8, tip: ['6 ו-8 מ״מ הם העוביים הנפוצים בשלט כניסה למשרד. זכוכית עבה יותר נראית מסיבית יותר מהצד, שוקלת יותר ובדרך כלל עולה יותר.'], choices: [
        { v: 6, label: mm(6), hint: 'נפוץ בשלט כניסה למשרד' },
        { v: 8, label: mm(8), hint: 'נפוץ בשלט כניסה למשרד' },
        { v: 10, label: mm(10) },
      ] },
      { key: 'mount', label: 'התקנה', def: 'standoff', tip: ['ברגי הרחקה גלויים: ארבעה ברגים מכרום ניקל שהם חלק מהעיצוב.',
        'הרחקה נסתרת: לא רואים ברגים, כמו בשלטי הזכוכית בלובי של CYNET.'], choices: [
        { v: 'standoff', label: 'ברגי הרחקה גלויים' },
        { v: 'hidden', label: 'הרחקה נסתרת', hint: 'לא רואים את הברגים' },
      ] },
    ],
  },
};

export const ORDER = ['pvc', 'alu', 'lit', 'glass'];

// ההסברים שלא שייכים לאפשרות אחת
export const TIPS = {
  compare: 'בכל סוג נחזור אליכם עם המלצה והצעת מחיר מדויקת, לפי הקיר והלוגו.',
  size: ['הרוחב הוא אחד הדברים שהכי משפיעים על המחיר: שלט רחב יותר הוא יותר חומר ויותר עבודה.', 'לא בטוחים? השאירו בערך, ונדייק יחד בטלפון.'],
  palette: ['כל צבע בלוגו הוא חלק שנצבע או מיוצר בנפרד, ולכן לוגו בפחות צבעים פשוט יותר לייצור.', 'אם הקובץ הביא איתו גם רקע, כבו אותו כאן.'],
};

export function defaults(id) {
  return Object.fromEntries(PRODUCTS[id].options.map((o) => [o.key, o.def]));
}

export function visibleOptions(id, c) {
  return PRODUCTS[id].options.filter((o) => !o.when || o.when(c));
}

// האם צבעי הלוגו משפיעים על ההדמיה (במתכת מוברשת, בזהב ובשחור לא)
export function usesLogoColors(id, c) {
  if (id === 'alu') return c.finish === 'paint';
  if (id === 'lit') return c.mode === 'front' || c.face === 'paint';
  return true;
}

const BLACK = '#1d1d1f';

export function toSpec(id, c) {
  const letters = (o) => ({ type: 'letters', side: null, light: null, ...o });
  switch (id) {
    case 'pvc':
      return letters({ depth: c.thick / 10, standoff: c.mount === 'float' ? 2 : 0, face: { finish: 'paint' } });
    case 'alu': {
      const face = { brushed: { finish: 'brushed' }, gold: { finish: 'gold' }, black: { finish: 'paint', color: BLACK }, paint: { finish: 'paint' } }[c.finish];
      return c.build === 'built'
        ? letters({ depth: c.depth, standoff: 0, face, side: face })
        : letters({ depth: c.thick / 10, standoff: 0, face });
    }
    case 'lit': {
      const light = { mode: c.mode, tone: c.tone };
      if (c.mode === 'halo') {
        const face = { finish: c.face === 'brushed' ? 'brushed' : 'paint' };
        return letters({ depth: 5, standoff: 3, face, side: face, light });
      }
      return letters({ depth: 6, standoff: 0, face: { finish: 'acrylic' }, side: c.sides === 'black' ? { finish: 'paint', color: BLACK } : null, light });
    }
    case 'glass':
      return { type: 'glass', depth: 0, standoff: 2.5, face: { finish: 'paint' }, side: null, light: null,
        glass: { kind: c.kind, thickness: c.thick / 10, hidden: c.mount === 'hidden' } };
  }
  throw new Error(`unknown product ${id}`);
}

// שורות לסיכום ולמייל: שם המוצר ואחריו כל בחירה שמוצגת
export function describe(id, c) {
  const p = PRODUCTS[id];
  return [p.name, ...visibleOptions(id, c).map((o) => `${o.label}: ${o.choices.find((x) => x.v === c[o.key])?.label ?? c[o.key]}`)];
}
