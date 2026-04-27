# Launch as MPV proti návrh

# Zadanie – Rezervačný systém pre prezentačný/workshopový STEM náves

Nech je projekt zabalený v doker file

Robustná, škálovateľnosť, nasaditeľná

## 1) Cieľ projektu

Navrhni a implementuj webový rezervačný systém, ktorý umožní:

- registrovaným používateľom (**základné školy**) rezervovať **termíny návštevy návesu** a **konkrétne technológie** (napr. vstrekolis, vákuová odlievacia komora, priemyselné roboty/coboty, VR/AR, mikroelektronika, pneumatika, technológia Fischertechnik,…),
- administrátorom **spravovať kapacity, technológie, termíny a schvaľovať/odmietať rezervácie**.

Systém musí odrážať **viacstupňový proces**: registrácia → overenie e‑mailu → výber termínu → výber technológie → uvedenie účelu → odoslanie žiadosti → schválenie/úprava administrátorom (KIRA) → notifikácie.

## 2) Používateľské roly

- **Neregistrovaný návštevník**: prezeranie verejného kalendára dostupných slotov (bez mena klientov), registrácia, prihlásenie, základné info o technológiách.
- **Registrovaný používateľ** (štandardný): správa profilu, vytváranie/úprava/zrušenie rezervácií, prehľad histórie, príjem notifikácií.
- **Administrátor**: CRUD nad technológiami, termínmi, kapacitami; schvaľovanie/odmietanie; presúvanie rezervácií; správa používateľov; exporty.

## 3) Funkčné požiadavky

**3.1 Registrácia a prihlásenie**

- Registrácia cez e‑mail + heslo, povinné **overenie e‑mailu** (schválenie administrátorom + admin odošle potvrdzovací email).
- Obnova hesla.
- Voliteľné doplnkové polia (organizácia/škola, IČO/DIČ, telefón, poznámka - napr. funkcia v škole).

**3.2 Profil používateľa**

- Zobrazenie a editácia profilu.
- História rezervácií a ich stavy (Koncept → Odoslané → Schválené → Zamietnuté → Zrušené → Prebehlo).

**3.3 Technológie a kapacity**

- Evidencia technológií (názov, popis, požadované zručnosti/poistenie/vekové obmedzenie, **kapacita súbežných rezervácií**, minimálna/ maximálna dĺžka slotu, podmienky používania).

**3.4 Kalendár a sloty**

- **Prehľadný kalendár** (mesiac) s farbami: voľné, zarezervované, blokované/údržba.
- Tvorba slotov administrátorom: jednorazové, opakované (RRULE – napr. každý utorok 9:00–12:00), dočasné **blokácie** (údržba, logistika, presun návesu).

**3.5 Rezervácie**

- Proces vo „wizard“ štýle: výber termínu → výber technológie → účel → doplnkové polia (počet účastníkov, požiadavky na materiál, zodpovedná osoba).
- **predchádzanie konfliktov**: prekrytie časov, preťaženie kapacity, kolízie závislostí.
- **Schvaľovací workflow**: administrátor môže rezerváciu schváliť, zamietnuť (s dôvodom).
- Zmeny a storno: definuj **storno podmienky** (nutnosť nahlásenia 2 týždne pred podujatím).

**3.6 Notifikácie a pripomienky**

- E‑maily: registrácia, potvrdenie e‑mailu, prijatie žiadosti, schválenie/odmietnutie, zmena termínu, pripomienka (24–72 h pred).
- Šablóny e‑mailov s premennými (meno, termín, technológia).

**3.7 Administrácia**

- **Dashboard**: denné/ týždenné rezervácie, kapacitné vyťaženie, čakajúce žiadosti, žiadosti o schválenie emailu.
- CRUD pre technológie, sloty, používateľov, pravidlá (závislosti, limity).
- **Reporty a exporty** (CSV/XLSX): mesačné využitie technológií, priemerné kapacitné pokrytie, najčastejšie zamietacie dôvody.

## 4) Nefunkčné požiadavky

- **dizajn** (iba desktop).
- **Výkon**: načítanie kalendára s čo najmenším delayom (cca 2-3 sekundy).
- **Bezpečnosť**: hashovanie hesiel (bcrypt/argon2), SQLi.

## 5) Biznis pravidlá a validácie

- **Kapacitné limity**: rezervácia nesmie prekročiť kapacitu technológie v danom čase.
- **Závislosti**: určité technológie vyžadujú školenie vopred; bez splnenia nemôže byť rezervácia schválená (stav rezervácia = čaká sa na školenie zákazníka).
- **Vek/BOZP podmienky**: ak sa vyžaduje, systém to v procese vyžiada a označí na schválenie.
- **Konfliktné termíny**: presun návesu medzi lokalitami blokuje všetky technológie (globálna blokácia rezervovania v danom čase).
- **Obmedzenia zmien**: úprava rezervácie najneskôr 14 dní vopred (parametrizovateľné).

## 6) API (príklad REST rozhraní)

- POST /auth/register, POST /auth/login, POST /auth/verify-email, POST /auth/forgot, POST /auth/reset
- GET /workspaces, POST /workspaces (admin), PATCH /workspaces/:id (admin)
- GET /calendar?workspaceId=&locationId=&from=&to=
- POST /reservations (validácia konfliktov), GET /reservations/me, PATCH /reservations/:id, DELETE /reservations/:id
- POST /reservations/:id/submit, POST /reservations/:id/approve (admin), POST /reservations/:id/reject (admin)
- GET /reports/utilization?from=&to=, GET /exports/reservations.csv (admin)

## 7) UX tok používateľa (high‑level)

1. Návštevník otvorí stránku → vidí kalendár s dostupnosťou (bez údajov o iných klientoch).
2. Klikne na voľný časový slot → systém vyzve na registráciu/prihlásenie a systém uzamkne daný slot na 15 minút, aby si ho nikto iný nemohol rezervovať.
3. Po prihlásení zvolí technológiu, uvedie účel, počet účastníkov, súhlasí s podmienkami.
4. Rezervácia sa uloží v stave **Odoslané.**
5. administrátor ju **schváli/odmietne a odošle email (pri odmietnutí navrhne alternatívu v emaili)**.

## 8) Testovanie a akceptačné kritériá

**Mínimálne scenáre:**

- Registrácia → verifikácia e‑mailu → prihlásenie (pozitívny aj negatívny test – zlý token, expirácia).
- Tvorba rezervácie s kolíziou kapacity → systém zamietne s chybou.
- Tvorba rezervácie bez splnených závislostí (vyžaduje dohľad) → označí „na schválenie“ alebo zakáže odoslať.
- Admin upraví čas slotu → dotknutým rezerváciám odošle notifikáciu (email).
- Storno po lehote → zobrazí sa upozornenie a vyžaduje potvrdenie/komunikáciu s adminom.
- Export rezervácií za mesiac → CSV s očakávanými stĺpcami.

**Merateľné kritériá akceptácie:**

- 0 kritických a max. 3 stredné bugy v testovacom dni.

## 9) Dokumentácia a výstupy

- **Release balíček**: zdrojové kódy, docker-compose (ak použiješ), demo seed dáta.
- jednoduchá príručka pre požívatela a admina s príslušnými náležitostami