# Originál dokument od dodávateľa

# Zadanie – Rezervačný systém pre prezentačný/workshopový STEM náves

## 1) Cieľ projektu

Navrhni a implementuj webový rezervačný systém, ktorý umožní:

- registrovaným používateľom (**základné a stredné školy**, firmy, jednotlivci) rezervovať **termíny návštevy návesu** a **konkrétne technológie** (napr. vstrekolis, vákuová odlievacia komora, priemyselné roboty/coboty, VR/AR, mikroelektronika, pneumatika, technológia Fischertechnik,…),
- administrátorom **spravovať kapacity, technológie, termíny a schvaľovať/odmietať rezervácie**.

Systém musí odrážať **viacstupňový proces**: registrácia → overenie e‑mailu → výber termínu → výber technológie → uvedenie účelu → odoslanie žiadosti → schválenie/úprava administrátorom (KIRA) → notifikácie.

## 2) Používateľské roly

- **Neregistrovaný návštevník**: prezeranie verejného kalendára dostupných slotov (bez mena klientov), registrácia, prihlásenie, základné info o technológiách.
- **Registrovaný používateľ** (štandardný): správa profilu, vytváranie/úprava/zrušenie rezervácií, prehľad histórie, príjem notifikácií.
- **Administrátor**: CRUD nad technológiami, termínmi, kapacitami; schvaľovanie/odmietanie; presúvanie rezervácií; správa používateľov; exporty; reporty; audit log.

## 3) Funkčné požiadavky

**3.1 Registrácia a prihlásenie**

- Registrácia cez e‑mail + heslo, povinné **overenie e‑mailu** (double opt‑in).
- Obnova hesla (reset link s časovou expiraciou).
- Voliteľné doplnkové polia (organizácia/škola, IČO/DIČ, telefón, poznámka - napr. funkcia v škole).

**3.2 Profil používateľa**

- Zobrazenie a editácia profilu.
- História rezervácií a ich stavy (Koncept → Odoslané → Schválené → Zamietnuté → Zrušené → Prebehlo).
- Možnosť stiahnuť potvrdenie o rezervácii (PDF).

**3.3 Technológie a kapacity**

- Evidencia technológií (názov, popis, požadované zručnosti/poistenie/vekové obmedzenie, **kapacita súbežných rezervácií**, minimálna/ maximálna dĺžka slotu, podmienky používania).
- Možnosť **závislostí a konfliktov** (napr. „robot + bezpečnostný dohľad“, „VR vyžaduje priestor“, „vstrekolis nekompatibilný s časom údržby“).

**3.4 Kalendár a sloty**

- **Prehľadný kalendár** (týždeň/mesiac) s farbami: voľné, žiadosť čaká, potvrdené, blokované/údržba.
- Filter podľa technológie, kapacity, miesta zastavenia návesu, typu udalosti (demá, workshopy, školské návštevy).
- Tvorba slotov administrátorom: jednorazové, opakované (RRULE – napr. každý utorok 9:00–12:00), dočasné **blokácie** (údržba, logistika, presun návesu).

**3.5 Rezervácie**

- Proces vo „wizard“ štýle: výber termínu → výber technológie → účel → doplnkové polia (počet účastníkov, požiadavky na materiál, zodpovedná osoba).
- **Kontrola konfliktov**: prekrytie časov, preťaženie kapacity, kolízie závislostí.
- **Schvaľovací workflow**: administrátor môže rezerváciu schváliť, vrátiť na doplnenie, navrhnúť alternatívny termín alebo zamietnuť (s dôvodom).
- Zmeny a storno: definuj **storno podmienky** (nutnosť nahlásenia 2 týždne pred podujatím).

**3.6 Notifikácie a pripomienky**

- E‑maily: registrácia, potvrdenie e‑mailu, prijatie žiadosti, schválenie/odmietnutie, zmena termínu, pripomienka (24–72 h pred), poďakovanie/feedback po akcii.
- Voliteľne push/kalendárne pozvánky (ICS súbor).
- Šablóny e‑mailov s premennými (meno, termín, technológia, odkaz na detail).

**3.7 Administrácia**

- **Dashboard**: denné/ týždenné rezervácie, kapacitné vyťaženie, čakajúce žiadosti.
- CRUD pre technológie, sloty, používateľov, pravidlá (závislosti, limity).
- **Reporty a exporty** (CSV/XLSX): mesačné využitie technológií, priemerné kapacitné pokrytie, najčastejšie zamietacie dôvody.
- **Audit log**: kto čo zmenil, kedy (rezervácie, profily, nastavenia).

## 4) Nefunkčné požiadavky

- **Responzívny dizajn** (desktop, tablet, mobil), dostupnosť bez bariér (WCAG 2.1 AA, aspoň základné).
- **Výkon**: načítanie kalendára do 2 s pri 5000 rezerváciách/mesiac (testovacie dáta).
- **Bezpečnosť**: hashovanie hesiel (bcrypt/argon2), rate limiting na auth endpointoch, ochrana proti CSRF/XSS/SQLi, reCAPTCHA (alebo ekvivalent) pri registrácii.
- **Ochrana údajov** (GDPR): súhlasy, zásady spracúvania, právo na výmaz/opravu, minimalizácia údajov, logika retention (napr. osobné údaje anonymizovať po 24 mesiacoch).
- **Dostupnosť a zálohy**: min. 99,5 % (študentský cieľ), denné zálohy DB, možnosť obnovy.

## 5) Biznis pravidlá a validácie

- **Kapacitné limity**: rezervácia nesmie prekročiť kapacitu technológie v danom čase.
- **Závislosti**: určité technológie vyžadujú školenie vopred; bez splnenia nemôže byť rezervácia schválená.
- **Vek/BOZP podmienky**: ak sa vyžaduje, systém to v procese vyžiada a označí na schválenie.
- **Konfliktné termíny**: presun návesu medzi lokalitami blokuje všetky technológie (globálna blokácia).
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
2. Klikne na voľný časový slot → systém vyzve na registráciu/prihlásenie.
3. Po prihlásení zvolí technológiu, uvedie účel, počet účastníkov, súhlasí s podmienkami.
4. Rezervácia sa uloží v stave **Odoslané** → používateľ dostane potvrdzovací e‑mail.
5. KIRA administrátor ju **schváli/odmietne/navrhne alternatívu**.
6. Používateľ dostane e‑mail a pozvánku do kalendára (ICS).
7. Pred termínom príde **pripomienka**; po akcii **feedback formulár**.

## 8) Testovanie a akceptačné kritériá

**Mínimálne scenáre:**

- Registrácia → verifikácia e‑mailu → prihlásenie (pozitívny aj negatívny test – zlý token, expirácia).
- Tvorba rezervácie s kolíziou kapacity → systém zamietne s chybou.
- Tvorba rezervácie bez splnených závislostí (vyžaduje dohľad) → označí „na schválenie“ alebo zakáže odoslať.
- Admin upraví čas slotu → dotknutým rezerváciám odíde notifikácia a zmení sa ICS.
- Storno po lehote → zobrazí sa upozornenie a vyžaduje potvrdenie/komunikáciu s adminom.
- Export rezervácií za mesiac → CSV s očakávanými stĺpcami.

**Merateľné kritériá akceptácie:**

- 0 kritických a max. 3 stredné bugy v testovacom dni.
- Čas odpovede < 500 ms pre 95. percentil pri 20 súbežných požiadavkách (lokálny test).
- Funkčné e‑mailové notifikácie v hlavných bodoch procesu.

## 9) Dokumentácia a výstupy

- **Používateľská príručka**: postupy pre používateľa a administrátora (screenshoty).
- **Technická dokumentácia**: ER diagram, popis API, architektúra, nasadenie, bezpečnostné opatrenia, zálohy.
- **Release balíček**: zdrojové kódy, docker-compose (ak použiješ), demo seed dáta.