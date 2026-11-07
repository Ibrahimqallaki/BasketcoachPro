# Spelarportal: reparation och testprotokoll

## Omfattning

Utgångspunkt: main `ee5060a611f35f7c5c1bfcf73fc90a89ce92bb3e`, Vercel-projekt `basketcoach-pro` i `ibrahims-projects-014d1d1f`.

Inloggningsrutan, personliga koder, kodhanteringen under Laget, dashboardens flikar och Scoreboard Live behålls. Inga Firestore-regler ändras. Ingen ny extern tjänst införs.

Klienten skapar/återanvänder en Firebase-session och skickar koden till `POST /api/player/login`. Firebase Admin verifierar ID-token kryptografiskt och söker koden i rätt databas. Exakt en träff krävs. Servern returnerar en signerad åttatimmarssession, bunden till Firebase-UID, spelare, coach, deployment och aktuell kod. Den hålls bara i flikens minne, inte i localStorage eller URL. Utloggning tar bort den. Omladdning kräver ny kodinloggning, liksom tidigare.

Alla privata spelaranrop kräver både Firebase-token och spelarens signerade session. Servern läser alltid aktuell spelare och kod igen. Ändrad kod eller borttagen spelare spärrar fortsatta anrop från den gamla sessionen; redan visad information kan inte tas tillbaka från skärmen. Klienten väljer aldrig vilken coach/spelare servern ska läsa eller skriva för.

Dashboardens svar innehåller den egna spelarprofilen utan accessCode och coachanteckningar, den egna matchfeedbacken, egen närvaro/utvärdering och tillåtna övningar. Andra spelarprofiler hämtas inte till webbläsaren. Matchresultat och lagets matchsammanfattning behålls. Skrivanrop tillåter enbart slutförandestatus för egna befintliga uppdrag, egna AI-feedbackfält, meddelanden till coachen och läskvitton i egen/lagets konversation. Servern bestämmer avsändare och mottagare.

Spelarchatten använder samma gränssnitt och dokumentformat, men hämtar uppdateringar var tionde sekund via servern. Coachens befintliga Firestore-prenumerationer påverkas inte. Detta undviker att nya regler behöver publiceras för att spelaren ska kunna läsa privata chattar. Notiser kan därför komma med upp till cirka tio sekunders fördröjning. Två vyer kan prenumerera samtidigt (olästa antal och öppen chatt).

## Konfiguration som återstår före verkligt inloggningstest

Vercels variabelmetadata visade endast produktionsvariabler och ingen Firebase Admin-behörighet. Inga hemliga värden hämtades eller ändrades.

1. Lägg en Firebase-servicekontonyckel för projektet `peppy-subset-1mln4` i Vercel-projektets **Sensitive** variabel `FIREBASE_SERVICE_ACCOUNT_JSON`, initialt endast **Preview**, helst begränsad till feature-grenen. Hela JSON-innehållet ska anges direkt i Vercel, aldrig i chatten eller GitHub. Använd ett dedikerat konto med minsta nödvändiga Firestore IAM-behörighet (läsa/söka samt skriva spelarfält, meddelanden och begränsningsräknare; ingen Owner/Editor-roll). SDK:ns vanliga ID-tokenverifiering kräver inte rättighet att skapa användare eller ändra Auth-konfiguration.
2. Kontrollera att Firebase Anonymous Auth är aktiverat. Appen använde redan anonym autentisering; enbart koden ger aldrig databasbehörighet.
3. Kontrollera collection-group-index för `players.accessCode` i databasen **`ai-studio-basketcoachpro-be123cc1-3f1a-42f3-ab2a-9a78021d1738`**, inte `(default)`. Förslag finns i `firestore.player-portal.indexes.json`. Skapa vid behov just detta index manuellt och vänta tills det är klart. Indexet är inte publicerat och filen är avsiktligt inte kopplad till en automatisk deploy.
4. Skapa en ny preview efter att servervariabeln lagts till. Lägg vid behov till preview-domänen bland Firebase Auths tillåtna domäner för coachens Google-inloggning.
5. AI-test kräver även att befintlig `GEMINI_API_KEY` finns i Preview. Ingen ny AI-nyckel ingår i denna reparation. Utan den ska Gemini lämna 503; kodinloggningen är oberoende av Gemini.

Servern stänger åtkomsten om konfiguration saknas. Någon offentlig läsrätt till `players` behövs inte: Admin SDK använder IAM och servern ansvarar därför för hela auktoriseringen. Se [Firebase Admin](https://firebase.google.com/docs/admin/setup), [serverbibliotek och regler](https://firebase.google.com/docs/firestore/security/insecure-rules) och [collection-group-index](https://firebase.google.com/docs/firestore/query-data/index-overview).

## Viktigt: preview delar produktions-Firebase

Både klient och server använder repots inbyggda `firebase-applet-config.json`. Projekt och databas är desamma för preview och produktion. De generella `FIREBASE_*`-variablerna i Vercel byter inte databas för den här koden; klientens inbyggda värden har även företräde över `VITE_FIREBASE_*`.

Testa därför med en särskild testspelare och testkonversation. Att ändra kod, markera ett uppdrag, spara AI-feedback eller skicka meddelande i preview ändrar den riktiga databasen. Även riktiga inloggningsförsök skriver begränsningsräknare i `_player_login_limits`. De automatiska testerna använder endast minnesdata och gör inga sådana skrivningar.

Kodgissning begränsas atomiskt i Firestore över alla funktionsinstanser: 10 försök per UID, 20 per IP och 300 totalt per 15 minuter. Vercels serverstyrda IP-header används i deployment. Gränserna gäller även lyckade inloggningar och kan behöva anpassas vid större lag. Räknare återanvänds efter tidsfönstret och har ett `expiresAt`-fält för eventuell framtida Firestore TTL-policy. Ingen TTL-policy har skapats. Utan en sådan ligger gamla räknardokument kvar. Sessioner signeras med serverkontots privata nyckel; nyckelrotation kräver omstart/ny preview och ny spelarinloggning.

Detta kräver ingen ny avgiftsbelagd tjänst, men befintliga Firebase/Vercel-kvoter och eventuell användningsdebitering gäller. Chatthämtning och räknare ökar antalet databasoperationer.

## Verifiering

Kör `npm run test:player-portal` och `npm run build` (bygget inkluderar TypeScript). API-testerna använder en isolerad Firestore/Auth-dubbel via samma Express-router; de är inte bevis för riktig IAM, databasindex eller en användares Firebase-konfiguration.

Säkerhetstester täcker giltig kod, fel kod, dubbla koder, avvisad Firebase-identitet, ingen session, manipulerad/utgången/överförd session, kodbyte, borttagen spelare, projektion av egen data, begränsade uppdragsskrivningar, chattisolering, avsändarförfalskning, feedbackfält och begränsning av kodgissning.

Verifierat lokalt: ren installation från låsfilen, godkänd TypeScript/produktionsbuild och isolerade API-tester. Den verkliga Express-appens health-route och nekad åtkomst utan session/serverbehörighet ingår också. Windows krävde en lokal komplettering av Rollups plattformspaket; inga beroendeversioner avvek från låsfilen. Inga privata nycklar finns i klientbygget.

En separat, lokal reproduktion bekräftade att `verifyFirebaseToken` i den gamla integrationshjälpen accepterar en syntetisk JWT med fel signatur och fel issuer om audience stämmer. Testet gjorde inga databasoperationer. Det nya spelar-API:t använder inte den hjälpen.

Beroendegranskning med `npm audit` rapporterade 19 sårbarhetsmarkerade paket (1 låg, 6 medel, 11 hög, 1 kritisk). Detta är paket-/advisoryfynd, inte verifierade exploateringar av appen. Kritisk markering gäller `websocket-driver`; bland höga finns befintliga bygg-/webbberoenden och `@grpc/grpc-js`. Den nya Admin-versionen valdes som 14.5.0 efter granskning, men hela beroendeträdet är inte säkerhetsuppdaterat. Gör en separat, testad beroendeuppdatering före produktionsgodkännande; ingen generell `audit fix --force` har körts.

Byggkonfigurationen har även avgränsats till appens källfiler: den tidigare Tailwind-sökningen gick igenom hela `node_modules`, vilket fördröjde bygget kraftigt efter att serverberoendet lades till. Befintliga appklasser behålls. Lockfilen synkroniseras med package.json, som på main redan innehöll Express/tsx utan motsvarande låsning.

### Manuellt godkännandetest när serverbehörigheten finns

1. Öppna preview på mobil och dator. Jämför inloggningssida, Laget, egen dashboard och flikar med produktionen.
2. Logga in som coach och skapa en särskild testspelare. Kopiera den befintliga koden under Laget. Verifiera att generera/ändra kod fungerar som tidigare.
3. Öppna en separat privat webbläsarsession och logga in med spelarens kod. Testa även felaktig kod samt inmatning med små bokstäver/mellanslag.
4. Kontrollera profil, färdigheter, utvecklingsplan, övningar, uppdrag och matchlogg. Nätverkssvar ska aldrig innehålla spelarkoder, coachanteckningar eller andra spelares feedback/närvaro.
5. Markera ett testuppdrag klart och kontrollera resultatet i coachens vy. Spelaren ska inte kunna ändra uppdragets titel eller tilldelning.
6. Skicka direktmeddelanden åt båda håll och ett lagmeddelande från coachen. Kontrollera läskvitton och oläst räknare; en annan testspelares direktchatt får inte visas.
7. Byt testspelarens kod hos coachen. Den gamla koden ska misslyckas, pågående sessions nästa serveranrop ska nekas och den nya koden ska fungera. Ingen annan spelares kod får påverkas.
8. Logga ut. Gamla sidan ska inte kunna fortsätta hämta data. Ladda om och kontrollera att kod krävs igen.
9. Om AI finns konfigurerad i Preview: testa spelarens feedback och övningsfråga; kontrollera att bara egna feedbackfält sparas.
10. Regressionstest: coachinloggning, kodhantering i Laget, match/träningspass samt befintlig Scoreboard Live. Live-koden och reglerna har inte ändrats, men måste ändå jämföras i den verkliga miljön.

Gör ingen merge, production deployment eller publicering av Firestore-regler före användarens verifiering och uttryckliga godkännande.

## Andra fynd, prioriterade men inte ändrade

| Prioritet | Fynd i main | Följd / återstående kontroll |
| --- | --- | --- |
| P1 | `firestore.rules` saknar tillåtande regel för `live_matches`, som `liveMatchService.ts` använder. | Repo-reglerna skulle neka Live. Eftersom användaren uppger att Live fungerar kan publicerade regler avvika. Läs och jämför verkliga regler före varje framtida regelpublicering. Publicera inte repo-filen blint. Verkliga regler har inte kunnat läsas här. |
| P1 | `verifyFirebaseToken` i `services/firestoreDb.ts` avkodar JWT utan signaturkontroll, och accepterar matchande audience **eller** issuer. | Integrations-API:ts coachidentifiering kan förfalskas. REST-läsningarna skickar token vidare till Firestore, som fortfarande kan neka den; detta fynd bevisar inte dataläckage. En separat ändring bör återanvända kryptografisk verifiering. Nya spelar-API:t använder Firebase Admin och använder inte denna hjälpfunktion. |
| P1 | Skrivande `/api/v1/matches` och `/planned-sessions` använder serverns web-SDK utan att ge SDK:n anroparens autentiserade session. | Med strikta owner-regler förväntas skrivningar nekas även med giltig token till API:t. Behöver verifieras med riktig coachsession och repareras separat; ingen testsparning mot verkliga data har gjorts. |
| P1 | `app_settings` kan skrivas och `app_tickets` läsas/ändras av alla autentiserade, även anonyma, enligt repots regler. | UI:ts superadmin-kontroll är inte ett serverbehörighetsskydd. Whitelist och supportärenden behöver en separat regelgranskning. Publicerade regler kan avvika. |
| P2 | Vercel har miljövariabler enbart för Production enligt granskad metadata. | Preview saknar Gemini-nyckel och nya serverbehörigheten; ett grönt frontendbygge bevisar inte att API-funktioner fungerar. |
| P2 | Firebase-konfigurationen är hårdkodad och delas av preview/produktion; `firebase.json` nämner både namngiven och default-databas. | Stor risk för tester mot riktiga data eller oavsiktlig regelpublicering till fel/flera databaser. Separat testdatabas kräver en medveten senare konfigurationsändring. |

Inga orelaterade funktionsmoduler, Live-filer, spelarkoder eller befintliga Firestore-dokument har ändrats inom denna reparation.
