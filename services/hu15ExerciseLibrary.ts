import type { Exercise } from '../types';

/**
 * Egna HU15-övningar inspirerade av Svensk Baskets spelarutvecklingsramverk
 * och USA Basketball/Jr. NBA:s spelbaserade ungdomsmetodik.
 * Inte officiella övningar eller ett godkänt utbildningsmaterial från organisationerna.
 * Video URLs utelämnas tills en relevant video har verifierats.
 * Referenser: https://www.basket.se/aktiva/tranare/inspiration-och-ovningar/
 * https://www.usab.com/play/youth-basketball-guidelines
 * https://jr.nba.com/jr-nba-instructional-curriculum/
 */
export const hu15ExercisesByPhase: Record<number, Exercise[]> = {
  "1": [
    {
      "id": "hu15_s1",
      "title": "1v1 från rörelse – attackera ytan",
      "inspiration": "Svensk Basket",
      "category": "Dribbling",
      "level": "Medel",
      "duration": "10 min",
      "overview": {
        "setup": "Par i korridorer; anfallaren börjar utan boll och får passning i rörelse.",
        "action": "Försvararen startar ett steg bakom. Anfallaren läser försprånget och attackerar korgen inom 4 sekunder.",
        "coachingPoint": "Första steget efter mottagning; blicken mot korgen."
      },
      "pedagogy": {
        "what": "Skapa och behålla ett litet övertag.",
        "how": "Börja 1v0, gå till 1v1 med aktiv försvarare och byt sida efter varje försök.",
        "why": "Spelaren tränar att fatta beslut under tidspress."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "Försvararen startar ett steg bakom. Anfallaren läser försprånget och attackerar korgen inom 4 sekunder.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Explosiv start",
        "Kontroll i fart",
        "Avslut med balans"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: 1v1 från rörelse – attackera ytan. Par i korridorer; anfallaren börjar utan boll och får passning i rörelse."
    },
    {
      "id": "hu15_s2",
      "title": "Reaktiv 1v1 – stoppa och vänd",
      "inspiration": "Svensk Basket",
      "category": "Försvar",
      "level": "Medel",
      "duration": "9 min",
      "overview": {
        "setup": "Par i 8x8 meters ruta, boll till en spelare.",
        "action": "Coach pekar startväg; anfallaren försöker passera, försvararen bromsar med fötterna och styr mot sidlinjen.",
        "coachingPoint": "Håll avstånd och flytta fötter – undvik handkontakt."
      },
      "pedagogy": {
        "what": "Koppla försvarsfotarbete till spelsituation.",
        "how": "Börja med styrd riktning, gör sedan fritt 1v1 och avsluta med korg.",
        "why": "Ökar kontroll och förmåga att stoppa drivningar."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "Coach pekar startväg; anfallaren försöker passera, försvararen bromsar med fötterna och styr mot sidlinjen.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Balans",
        "Försvarsvinkel",
        "Inga onödiga fouls"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: Reaktiv 1v1 – stoppa och vänd. Par i 8x8 meters ruta, boll till en spelare."
    },
    {
      "id": "hu15_u1",
      "title": "Advantage first step – live 1v1",
      "inspiration": "USA Basketball",
      "category": "Basket-IQ",
      "level": "Medel",
      "duration": "10 min",
      "overview": {
        "setup": "Anfallare på vingen, försvarare börjar med ena foten i färgen.",
        "action": "Passaren spelar bollen och försvararen closeoutar; anfallaren läser öppet skott eller drive.",
        "coachingPoint": "Beslut före första studs – hota korgen."
      },
      "pedagogy": {
        "what": "Utnyttja ett tillfälligt övertag.",
        "how": "Börja med skott eller drive; lägg därefter till försvararens styrning.",
        "why": "Förenar bollkontroll, fotarbete och läsning."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "Passaren spelar bollen och försvararen closeoutar; anfallaren läser öppet skott eller drive.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Snabbt beslut",
        "Attack mot öppen yta",
        "Kontrollerat avslut"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: Advantage first step – live 1v1. Anfallare på vingen, försvarare börjar med ena foten i färgen."
    },
    {
      "id": "hu15_u2",
      "title": "Mirror-to-cut – reaktion och balans",
      "inspiration": "USA Basketball",
      "category": "Fysik",
      "level": "Medel",
      "duration": "8 min",
      "overview": {
        "setup": "Två spelare mittemot varandra mellan två koner.",
        "action": "Ledaren rör sig lateralt 3–5 sekunder; följaren speglar. På signal sprintar båda mot markerad linje och bromsar.",
        "coachingPoint": "Landa med mjuka knän och stabil höft."
      },
      "pedagogy": {
        "what": "Träna koordination, reaktion och riktningsbyte.",
        "how": "Gör först långsamt, öka sedan tempot och lägg till boll för ledaren.",
        "why": "Skapar en säkrare rörelsegrund för 1v1."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "Ledaren rör sig lateralt 3–5 sekunder; följaren speglar. På signal sprintar båda mot markerad linje och bromsar.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Reaktionsförmåga",
        "Knäkontroll",
        "Snabb riktningsändring"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: Mirror-to-cut – reaktion och balans. Två spelare mittemot varandra mellan två koner."
    }
  ],
  "2": [
    {
      "id": "hu15_s3",
      "title": "3v3 passning, cut och ersätt",
      "inspiration": "Svensk Basket",
      "category": "Passningar",
      "level": "Medel",
      "duration": "12 min",
      "overview": {
        "setup": "Tre anfallare utanför trepoängslinjen mot tre försvarare.",
        "action": "Efter passning skär spelaren mot korg och fyller sedan ledig plats; avslut ges efter lyckad cut eller drive.",
        "coachingPoint": "Skapa ny passningsvinkel direkt efter passning."
      },
      "pedagogy": {
        "what": "Träna rörelse utan boll och spacing.",
        "how": "Först utan dribbling; sedan max två studs och till sist fritt spel.",
        "why": "Skapar passningsalternativ i matchfart."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "Efter passning skär spelaren mot korg och fyller sedan ledig plats; avslut ges efter lyckad cut eller drive.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Cut med fart",
        "Bredd och djup",
        "Kommunikation"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: 3v3 passning, cut och ersätt. Tre anfallare utanför trepoängslinjen mot tre försvarare."
    },
    {
      "id": "hu15_s4",
      "title": "Ge och gå – 2v2 med läsning",
      "inspiration": "Svensk Basket",
      "category": "Basket-IQ",
      "level": "Medel",
      "duration": "10 min",
      "overview": {
        "setup": "Två anfallare och två försvarare på ena sidan planen.",
        "action": "Anfallaren passar och skär; passaren läser om cutten är fri eller om man ska spela vidare.",
        "coachingPoint": "Cut till korg med blicken på bollen."
      },
      "pedagogy": {
        "what": "Förstå timing och försvararens position.",
        "how": "Starta med halvaktivt försvar, lägg till full 2v2 och bytesregler.",
        "why": "Utvecklar passning och kollektivt beslutsfattande."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "Anfallaren passar och skär; passaren läser om cutten är fri eller om man ska spela vidare.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Timing",
        "Passningskvalitet",
        "Rätt val vid försvar"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: Ge och gå – 2v2 med läsning. Två anfallare och två försvarare på ena sidan planen."
    },
    {
      "id": "hu15_u3",
      "title": "0,5-sekundersbeslut – 3v3",
      "inspiration": "USA Basketball",
      "category": "Basket-IQ",
      "level": "Avancerad",
      "duration": "12 min",
      "overview": {
        "setup": "3v3 på halvplan, coach räknar högt vid varje mottagning.",
        "action": "Spelaren ska skjuta, passa eller attackera inom ungefär en sekund; fortsätt tills ett bra avslut uppstår.",
        "coachingPoint": "Läs innan du får bollen; undvik stillastående."
      },
      "pedagogy": {
        "what": "Öka speltempo och scanning.",
        "how": "Börja utan tidskrav, inför därefter snabb beslutsregel och press.",
        "why": "Flyttar fokus från isolerade moment till val i spel."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "Spelaren ska skjuta, passa eller attackera inom ungefär en sekund; fortsätt tills ett bra avslut uppstår.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Blick före fångst",
        "Snabbt beslut",
        "Spacing"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: 0,5-sekundersbeslut – 3v3. 3v3 på halvplan, coach räknar högt vid varje mottagning."
    },
    {
      "id": "hu15_u4",
      "title": "4v3 Keep-away to score",
      "inspiration": "USA Basketball",
      "category": "Passningar",
      "level": "Avancerad",
      "duration": "12 min",
      "overview": {
        "setup": "Fyra anfallare mot tre försvarare i 4-out; en extra försvarare kliver in efter första passet.",
        "action": "Behåll bredd, passa mot övertag och attackera korgen före försvaret hinner organisera sig.",
        "coachingPoint": "Få bollen ur händerna när försvaret hjälper."
      },
      "pedagogy": {
        "what": "Utnyttja numerära övertag.",
        "how": "Börja med 4v3, övergå till 4v4 live efter pass och tillämpa vid uppspel.",
        "why": "Förbereder transition och pressade passningsbeslut."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "Behåll bredd, passa mot övertag och attackera korgen före försvaret hinner organisera sig.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Bollrörelse",
        "Passningsfönster",
        "Rätt avslut"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: 4v3 Keep-away to score. Fyra anfallare mot tre försvarare i 4-out; en extra försvarare kliver in efter första passet."
    }
  ],
  "3": [
    {
      "id": "hu15_s5",
      "title": "2v1 till 2v2 – avslut under press",
      "inspiration": "Svensk Basket",
      "category": "Layups",
      "level": "Medel",
      "duration": "11 min",
      "overview": {
        "setup": "Två anfallare från mittlinjen, en försvarare vid strafflinjen och en jagande.",
        "action": "Anfallarna löser 2v1 och avslutar; den jagande försvararen skapar sent ett 2v2-läge.",
        "coachingPoint": "Driv mot korgen för att binda försvararen."
      },
      "pedagogy": {
        "what": "Träna avslut och passning vid varierande övertag.",
        "how": "Starta med stilla försvar, låt sedan andra försvararen jaga aktivt.",
        "why": "Gör finishing spelrelevant och varierad."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "Anfallarna löser 2v1 och avslutar; den jagande försvararen skapar sent ett 2v2-läge.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Rätt beslut",
        "Bollskydd",
        "Stark landning"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: 2v1 till 2v2 – avslut under press. Två anfallare från mittlinjen, en försvarare vid strafflinjen och en jagande."
    },
    {
      "id": "hu15_s6",
      "title": "1v1 från closeout – två typer av avslut",
      "inspiration": "Svensk Basket",
      "category": "Layups",
      "level": "Medel",
      "duration": "10 min",
      "overview": {
        "setup": "Anfallare på vingen, passare i toppen och försvarare i hjälpposition.",
        "action": "Vid mottagning läser anfallaren closeout: attackera höft och välj layup eller stopp-avslut.",
        "coachingPoint": "Låt försvararens fart avgöra ditt val."
      },
      "pedagogy": {
        "what": "Koppla första steg till avslutsteknik.",
        "how": "Byt mellan aggressiv och kontrollerad closeout; räkna poäng för bra beslut.",
        "why": "Utvecklar precision under aktivt motstånd."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "Vid mottagning läser anfallaren closeout: attackera höft och välj layup eller stopp-avslut.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Fotarbete",
        "Avslutsvariation",
        "Läsning"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: 1v1 från closeout – två typer av avslut. Anfallare på vingen, passare i toppen och försvarare i hjälpposition."
    },
    {
      "id": "hu15_u5",
      "title": "Finish through contact – 2v2",
      "inspiration": "USA Basketball",
      "category": "Layups",
      "level": "Avancerad",
      "duration": "12 min",
      "overview": {
        "setup": "Två anfallare, två försvarare, en korg; använd kroppskuddar endast om säkert.",
        "action": "Anfallaren attackerar, tar kontrollerad kontakt med balans och avslutar; returtagning fortsätter live.",
        "coachingPoint": "Skydda bollen och landa stabilt; ingen hård knuff."
      },
      "pedagogy": {
        "what": "Utveckla avslut när en försvarare stör.",
        "how": "Börja med vertikalt aktivt försvar, öka motståndet gradvis.",
        "why": "Förbereder avslut i matchliknande trängsel."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "Anfallaren attackerar, tar kontrollerad kontakt med balans och avslutar; returtagning fortsätter live.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Bollskydd",
        "Balans",
        "Avslut med båda händer"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: Finish through contact – 2v2. Två anfallare, två försvarare, en korg; använd kroppskuddar endast om säkert."
    },
    {
      "id": "hu15_u6",
      "title": "Read-the-rim 1v1 – floater eller layup",
      "inspiration": "USA Basketball",
      "category": "Layups",
      "level": "Avancerad",
      "duration": "10 min",
      "overview": {
        "setup": "Anfallare vid toppen och en hjälpförsvarare nära korgen.",
        "action": "Starta drive mot korg; välj layup när ytan är fri eller floater om hjälpen kommer tidigt.",
        "coachingPoint": "Titta på hjälpförsvararen innan upphopp."
      },
      "pedagogy": {
        "what": "Träna avslutsbeslut mot rim protection.",
        "how": "Använd först två bestämda positioner för hjälp, sedan oförutsägbar hjälp.",
        "why": "Utvecklar spelförståelse framför förutbestämda rörelser."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "Starta drive mot korg; välj layup när ytan är fri eller floater om hjälpen kommer tidigt.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Rätt avslutsval",
        "Touch",
        "Kontrollerad landning"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: Read-the-rim 1v1 – floater eller layup. Anfallare vid toppen och en hjälpförsvarare nära korgen."
    }
  ],
  "4": [
    {
      "id": "hu15_s7",
      "title": "Extra pass till öppet skott – 3v3",
      "inspiration": "Svensk Basket",
      "category": "Skott",
      "level": "Medel",
      "duration": "12 min",
      "overview": {
        "setup": "Tre anfallare mot tre försvarare utanför trepoängslinjen.",
        "action": "Anfallarna söker paint touch, pass ut och extra pass till bättre skott innan försvararen hinner rotera.",
        "coachingPoint": "Händer redo och fotarbete före mottagning."
      },
      "pedagogy": {
        "what": "Förstå kvaliteten i ett öppet skott.",
        "how": "Starta med 3v2, gå till 3v3 med aktiv closeout.",
        "why": "Ökar träffsäkerhet och spelval."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "Anfallarna söker paint touch, pass ut och extra pass till bättre skott innan försvararen hinner rotera.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Skottberedskap",
        "Extra pass vid behov",
        "Balans"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: Extra pass till öppet skott – 3v3. Tre anfallare mot tre försvarare utanför trepoängslinjen."
    },
    {
      "id": "hu15_s8",
      "title": "Attackera closeout – skjut eller driv",
      "inspiration": "Svensk Basket",
      "category": "Skott",
      "level": "Medel",
      "duration": "10 min",
      "overview": {
        "setup": "Passare på toppen, anfallare i hörn och försvarare vid färgen.",
        "action": "Försvararen springer ut efter pass; anfallaren läser fötterna och skjuter, driver eller passar vidare.",
        "coachingPoint": "Titta på försvararens främre fot."
      },
      "pedagogy": {
        "what": "Skapa kvalitet i val efter bollmottagning.",
        "how": "Räkna 2 poäng för bra skottval oavsett träff.",
        "why": "Kopplar skotteknik till matchsituation."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "Försvararen springer ut efter pass; anfallaren läser fötterna och skjuter, driver eller passar vidare.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Snabbt fotarbete",
        "Bra avstånd",
        "Rätt skottval"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: Attackera closeout – skjut eller driv. Passare på toppen, anfallare i hörn och försvarare vid färgen."
    },
    {
      "id": "hu15_u7",
      "title": "Relocation shooting – 2v2",
      "inspiration": "USA Basketball",
      "category": "Skott",
      "level": "Avancerad",
      "duration": "12 min",
      "overview": {
        "setup": "Två anfallare, två försvarare; en boll på vingposition.",
        "action": "Vid drive roterar medspelaren till fri yta och tar catch-and-shoot efter kick-out.",
        "coachingPoint": "Flytta dig efter din medspelares drive."
      },
      "pedagogy": {
        "what": "Utveckla förmågan att skapa öppna skott utan boll.",
        "how": "Öka från passiv till full försvarsaktivitet.",
        "why": "Bygger förståelse för spacing och skottberedskap."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "Vid drive roterar medspelaren till fri yta och tar catch-and-shoot efter kick-out.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Flytt till fri yta",
        "Snabb release",
        "Skottbalans"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: Relocation shooting – 2v2. Två anfallare, två försvarare; en boll på vingposition."
    },
    {
      "id": "hu15_u8",
      "title": "Decision shooting – 3v3 med closeout",
      "inspiration": "USA Basketball",
      "category": "Skott",
      "level": "Avancerad",
      "duration": "12 min",
      "overview": {
        "setup": "3v3 på halvplan, försvarare startar ett steg från anfallare.",
        "action": "Anfallarna måste läsa closeout och välja skott, en-studs-pull-up eller passning.",
        "coachingPoint": "Låt kvalitet styra valet – inte bara skottprocent."
      },
      "pedagogy": {
        "what": "Träna skott efter ett spelbeslut.",
        "how": "Coach ger slumpade startpositioner så utfallet inte är förutsägbart.",
        "why": "Gör träningen mer matchlik."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "Anfallarna måste läsa closeout och välja skott, en-studs-pull-up eller passning.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Bra skottval",
        "Skotteknik i fart",
        "Kommunikation"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: Decision shooting – 3v3 med closeout. 3v3 på halvplan, försvarare startar ett steg från anfallare."
    }
  ],
  "5": [
    {
      "id": "hu15_s9",
      "title": "3v3 closeout, hjälp och återhämtning",
      "inspiration": "Svensk Basket",
      "category": "Försvar",
      "level": "Medel",
      "duration": "12 min",
      "overview": {
        "setup": "Tre anfallare mot tre försvarare på halvplan.",
        "action": "Bollflyttning tvingar closeout; vid drive hjälper närmaste och övriga roterar, sedan live spel.",
        "coachingPoint": "Se boll och spelare; prata innan hjälpen behövs."
      },
      "pedagogy": {
        "what": "Koppla individuellt försvar till lagförsvar.",
        "how": "Starta med styrd bollrörelse, gör sedan live 3v3.",
        "why": "Utvecklar samspel och kommunikation."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "Bollflyttning tvingar closeout; vid drive hjälper närmaste och övriga roterar, sedan live spel.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Closeoutbalans",
        "Hjälpposition",
        "Recovery"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: 3v3 closeout, hjälp och återhämtning. Tre anfallare mot tre försvarare på halvplan."
    },
    {
      "id": "hu15_s10",
      "title": "2v2 returtagning till outlet",
      "inspiration": "Svensk Basket",
      "category": "Returtagning",
      "level": "Medel",
      "duration": "11 min",
      "overview": {
        "setup": "Två anfallare och två försvarare, passare skjuter från toppen.",
        "action": "Vid skott ska försvararna hitta spelare, ta position och säkra returen; direkt outlet-passning till väntande guard.",
        "coachingPoint": "Hitta och kontakta, vänd, säkra med två händer."
      },
      "pedagogy": {
        "what": "Träna returtagning som start på anfall.",
        "how": "Starta med kontrollerade skott, gå mot kamp och direkt transition.",
        "why": "Kopplar boxout till snabb omställning."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "Vid skott ska försvararna hitta spelare, ta position och säkra returen; direkt outlet-passning till väntande guard.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Kontakt före boll",
        "Stabil fångst",
        "Snabb outlet"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: 2v2 returtagning till outlet. Två anfallare och två försvarare, passare skjuter från toppen."
    },
    {
      "id": "hu15_u9",
      "title": "Contain the drive – 1v1 no-reach",
      "inspiration": "USA Basketball",
      "category": "Försvar",
      "level": "Medel",
      "duration": "9 min",
      "overview": {
        "setup": "1v1 från vingposition, två koner markerar korridor mot korgen.",
        "action": "Anfallaren har max tre studs för att nå färgen; försvararen vinner genom att stoppa utan att slå på bollen.",
        "coachingPoint": "Bröst före hand – flytta fötterna."
      },
      "pedagogy": {
        "what": "Bygga disciplinerat försvar mot boll.",
        "how": "Börja med två studs och öka utrymmet.",
        "why": "Minskar fouls och ger bättre balans."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "Anfallaren har max tre studs för att nå färgen; försvararen vinner genom att stoppa utan att slå på bollen.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Rätt avstånd",
        "Fotarbete",
        "Ingen onödig foul"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: Contain the drive – 1v1 no-reach. 1v1 från vingposition, två koner markerar korridor mot korgen."
    },
    {
      "id": "hu15_u10",
      "title": "4v4 shell to live stop",
      "inspiration": "USA Basketball",
      "category": "Försvar",
      "level": "Avancerad",
      "duration": "13 min",
      "overview": {
        "setup": "4v4 från 4-out-uppställning med försvarare i hjälppositioner.",
        "action": "Coach låter anfallarna passa tre gånger, sedan övergår övningen till fritt spel och försvaret ska ta stopp och retur.",
        "coachingPoint": "Prata om boll, hjälp och byte – varje pass."
      },
      "pedagogy": {
        "what": "Träna gemensam defensiv rotation.",
        "how": "Börja utan skott i tre pass, öka sedan till live spel.",
        "why": "Stärker övergången från övningsstruktur till match."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "Coach låter anfallarna passa tre gånger, sedan övergår övningen till fritt spel och försvaret ska ta stopp och retur.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Kommunikation",
        "Rätt rotation",
        "Defensiv retur"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: 4v4 shell to live stop. 4v4 från 4-out-uppställning med försvarare i hjälppositioner."
    }
  ],
  "6": [
    {
      "id": "hu15_s11",
      "title": "Bollscreen 2v2 – läs försvarslösning",
      "inspiration": "Svensk Basket",
      "category": "Pick & Roll",
      "level": "Avancerad",
      "duration": "13 min",
      "overview": {
        "setup": "Guard på toppen, screener på vinge, två försvarare.",
        "action": "Anfall läser över/under skärm: drive, pass till roll eller omstart; byt roller efter varje försök.",
        "coachingPoint": "Sätt stabil skärm utan rörelse; läs försvaret."
      },
      "pedagogy": {
        "what": "Introducera realistiska bollscreenbeslut för U15–U16.",
        "how": "Öva först mot en försvarslösning och blanda sedan lösningar slumpvis.",
        "why": "Bygger vidare på svensk U15–U16-fokus på bollscreensituationer."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "Anfall läser över/under skärm: drive, pass till roll eller omstart; byt roller efter varje försök.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Laglig skärm",
        "Tajmning",
        "Rätt passningsbeslut"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: Bollscreen 2v2 – läs försvarslösning. Guard på toppen, screener på vinge, två försvarare."
    },
    {
      "id": "hu15_s12",
      "title": "Bollscreen försvar 3v3 – hjälp och återgång",
      "inspiration": "Svensk Basket",
      "category": "Försvar",
      "level": "Avancerad",
      "duration": "13 min",
      "overview": {
        "setup": "Tre anfallare i 3-out med bollscreen på vingen och tre försvarare.",
        "action": "Försvaret väljer kommunicerad strategi mot skärmen och roterar mot roller och skytt; spela klart 3v3.",
        "coachingPoint": "Ropa lösning före skärm; skydda korgen först."
      },
      "pedagogy": {
        "what": "Förstå lagets ansvar runt bollscreen.",
        "how": "Börja med en given lösning, lägg sedan till val baserat på anfall.",
        "why": "Tränar kollektivt agerande i högre spelnivå."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "Försvaret väljer kommunicerad strategi mot skärmen och roterar mot roller och skytt; spela klart 3v3.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Tydliga call",
        "Rätt hjälp",
        "Recovery"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: Bollscreen försvar 3v3 – hjälp och återgång. Tre anfallare i 3-out med bollscreen på vingen och tre försvarare."
    },
    {
      "id": "hu15_u11",
      "title": "5-out drive-and-kick game",
      "inspiration": "USA Basketball",
      "category": "Taktik",
      "level": "Avancerad",
      "duration": "13 min",
      "overview": {
        "setup": "5-out med fyra anfallare mot fyra försvarare och en neutral passare.",
        "action": "Skapa paint touch och kick-out; den fria spelaren måste fatta skott-/pass-/drivebeslut snabbt.",
        "coachingPoint": "Håll trepoängsavstånd och fyll tom plats."
      },
      "pedagogy": {
        "what": "Koppla drive till spacing och kollektiv beslutsprocess.",
        "how": "Börja med 4v3, gå mot 4v4 och därefter 5v5.",
        "why": "Skapar rörelse och kvalitet i drive-and-kick."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "Skapa paint touch och kick-out; den fria spelaren måste fatta skott-/pass-/drivebeslut snabbt.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Paint touch",
        "Spacing",
        "Snabbt beslut"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: 5-out drive-and-kick game. 5-out med fyra anfallare mot fyra försvarare och en neutral passare."
    },
    {
      "id": "hu15_u12",
      "title": "3v2 till 2v1 kontinuerligt",
      "inspiration": "USA Basketball",
      "category": "Transition",
      "level": "Medel",
      "duration": "12 min",
      "overview": {
        "setup": "Tre anfallare mot två försvarare på en korg; nästa grupp väntar vid mittlinjen.",
        "action": "Efter avslut spelar de två försvararna omgående åt andra hållet mot en jagande anfallare.",
        "coachingPoint": "Spring breda korridorer och fyll mitten."
      },
      "pedagogy": {
        "what": "Växla snabbt mellan anfall och försvar.",
        "how": "Börja med gångfart och två beslutsalternativ, öka till spelfart.",
        "why": "Tränar numerärt övertag och omställning."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "Efter avslut spelar de två försvararna omgående åt andra hållet mot en jagande anfallare.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Bredd",
        "Snabb transition",
        "Bra sista pass"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: 3v2 till 2v1 kontinuerligt. Tre anfallare mot två försvarare på en korg; nästa grupp väntar vid mittlinjen."
    }
  ],
  "7": [
    {
      "id": "hu15_s13",
      "title": "3v3 övertag från sidlinje – läs hjälpen",
      "inspiration": "Svensk Basket",
      "category": "Basket-IQ",
      "level": "Avancerad",
      "duration": "13 min",
      "overview": {
        "setup": "3v3 med anfallaren i hörn och försvararen startar från mitten.",
        "action": "På signal startar drive; medspelare ska fylla ytor och fatta beslut efter hjälp.",
        "coachingPoint": "Identifiera nästa fördel, inte ett bestämt spel."
      },
      "pedagogy": {
        "what": "Spela vidare på skapat övertag.",
        "how": "Variera vem som har fördel och låt försvaret byta rotation.",
        "why": "Fördjupar speluppfattning och kommunikation."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "På signal startar drive; medspelare ska fylla ytor och fatta beslut efter hjälp.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Läs hjälpen",
        "Spacing",
        "Nästa beslut"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: 3v3 övertag från sidlinje – läs hjälpen. 3v3 med anfallaren i hörn och försvararen startar från mitten."
    },
    {
      "id": "hu15_s14",
      "title": "Reject screen – 2v2 bollscreenval",
      "inspiration": "Svensk Basket",
      "category": "Pick & Roll",
      "level": "Avancerad",
      "duration": "12 min",
      "overview": {
        "setup": "Guard och screener mot två försvarare på sidan.",
        "action": "Guarden läser om försvaret fuskar över skärmen och kan välja att avvisa skärmen, gå runt eller passa roller.",
        "coachingPoint": "Titta på försvararens höft före beslut."
      },
      "pedagogy": {
        "what": "Fördjupa bollscreenläsning och timing.",
        "how": "Starta mot styrd försvarslösning, variera därefter.",
        "why": "Ger fler alternativ utan inövade mönster."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "Guarden läser om försvaret fuskar över skärmen och kan välja att avvisa skärmen, gå runt eller passa roller.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Skärmvinkel",
        "Beslut före studs",
        "Balans"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: Reject screen – 2v2 bollscreenval. Guard och screener mot två försvarare på sidan."
    },
    {
      "id": "hu15_u13",
      "title": "Pick-and-roll pocket pass – 2v2/3v3",
      "inspiration": "USA Basketball",
      "category": "Pick & Roll",
      "level": "Avancerad",
      "duration": "12 min",
      "overview": {
        "setup": "Två anfallare och två försvarare på toppen, en tredje hjälpförsvarare läggs till vid progression.",
        "action": "Skapa bollscreen, driva två steg och passa roller genom luckan; spela klart live.",
        "coachingPoint": "Passa framför rullande spelare med rätt fart."
      },
      "pedagogy": {
        "what": "Träna passningsfönster under press.",
        "how": "Börja med kon som hjälp, ersätt med aktiv tredje försvarare.",
        "why": "Bygger kombinationen av bollkontroll och passningsprecision."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "Skapa bollscreen, driva två steg och passa roller genom luckan; spela klart live.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Passningsvinkel",
        "Timing",
        "Rätt mottagning"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: Pick-and-roll pocket pass – 2v2/3v3. Två anfallare och två försvarare på toppen, en tredje hjälpförsvarare läggs till vid progression."
    },
    {
      "id": "hu15_u14",
      "title": "Off-ball screen read – 3v3",
      "inspiration": "USA Basketball",
      "category": "Taktik",
      "level": "Avancerad",
      "duration": "12 min",
      "overview": {
        "setup": "Tre anfallare: passare, screener och skytt; tre försvarare.",
        "action": "Skytten läser om försvar följer efter eller går under skärmen och väljer curl eller pop för avslut.",
        "coachingPoint": "Vänta tills screener står stilla och gå nära skärmen."
      },
      "pedagogy": {
        "what": "Utveckla rörelse utan boll i avancerat halvplansspel.",
        "how": "Lägg till passning efter hjälpförsvar och fortsätt 3v3.",
        "why": "Skapar matchrelevanta avslut genom skärmspel."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "Skytten läser om försvar följer efter eller går under skärmen och väljer curl eller pop för avslut.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Laglig skärm",
        "Curl/pop-läsning",
        "Bra mottagning"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: Off-ball screen read – 3v3. Tre anfallare: passare, screener och skytt; tre försvarare."
    }
  ],
  "8": [
    {
      "id": "hu15_s15",
      "title": "5v5 constraints – paint touch före skott",
      "inspiration": "Svensk Basket",
      "category": "Taktik",
      "level": "Avancerad",
      "duration": "15 min",
      "overview": {
        "setup": "Fullt 5v5 på halvplan med en tydlig regel och normal matchklocka.",
        "action": "Anfall får extra poäng om någon skapat paint touch före avslut; försvar vinner poäng för stopp och retur.",
        "coachingPoint": "Välj bästa avslut, tvinga inte drive om inget finns."
      },
      "pedagogy": {
        "what": "Integrera färdigheter i riktiga spelbeslut.",
        "how": "Byt till regel om extra pass och avsluta med helt fritt spel.",
        "why": "Överför lärandet till match."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "Anfall får extra poäng om någon skapat paint touch före avslut; försvar vinner poäng för stopp och retur.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Spacing",
        "Bra beslut",
        "Defensivt stopp"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: 5v5 constraints – paint touch före skott. Fullt 5v5 på halvplan med en tydlig regel och normal matchklocka."
    },
    {
      "id": "hu15_s16",
      "title": "Transition 3v3 till 5v5",
      "inspiration": "Svensk Basket",
      "category": "Transition",
      "level": "Avancerad",
      "duration": "14 min",
      "overview": {
        "setup": "Starta med 3v3 över fullplan; ytterligare två spelare per lag kliver in efter första avslutet.",
        "action": "Fortsätt från omställning till organiserat 5v5 utan avbrott.",
        "coachingPoint": "Sprinta hem, matcha upp och kommunicera roller."
      },
      "pedagogy": {
        "what": "Träna övergången mellan transition och uppställt spel.",
        "how": "Låt övningen först stanna vid 3v3 och lägg sedan till 5v5.",
        "why": "Förbättrar beslut i olika matchfaser."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "Fortsätt från omställning till organiserat 5v5 utan avbrott.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Kommunikation",
        "Försvarsbalans",
        "Snabb omställning"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: Transition 3v3 till 5v5. Starta med 3v3 över fullplan; ytterligare två spelare per lag kliver in efter första avslutet."
    },
    {
      "id": "hu15_u15",
      "title": "Special situations – sista åtta sekunderna",
      "inspiration": "USA Basketball",
      "category": "Basket-IQ",
      "level": "Avancerad",
      "duration": "12 min",
      "overview": {
        "setup": "5v5 med resultattavla: laget ligger under med 2 eller leder med 1, 8 sekunder kvar.",
        "action": "Starta med sidlinjeinkast; lagen får en enda possession att skapa bra läge eller säkra matchen.",
        "coachingPoint": "Alla måste känna tid, ställning och säkra passningsalternativ."
      },
      "pedagogy": {
        "what": "Träna beslut under matchpress.",
        "how": "Växla mellan ledning/underläge och olika inkastpositioner.",
        "why": "Stärker samarbete och lugn i avgörande lägen."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "Starta med sidlinjeinkast; lagen får en enda possession att skapa bra läge eller säkra matchen.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Tidsmedvetenhet",
        "Bra skottval",
        "Säkra passningar"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: Special situations – sista åtta sekunderna. 5v5 med resultattavla: laget ligger under med 2 eller leder med 1, 8 sekunder kvar."
    },
    {
      "id": "hu15_u16",
      "title": "4v4 transition stop-and-score",
      "inspiration": "USA Basketball",
      "category": "Transition",
      "level": "Avancerad",
      "duration": "14 min",
      "overview": {
        "setup": "4v4 över hela planen, två lag roterar direkt efter avslut.",
        "action": "Anfall försöker skapa ett snabbt övertag; försvar behöver stoppa boll, skydda korg och därefter ta retur.",
        "coachingPoint": "Försvar kommunicerar boll, korg och närmaste hot."
      },
      "pedagogy": {
        "what": "Sätta samman snabb anfallsomställning och kollektivt försvar.",
        "how": "Börja utan dribbling första passet, fortsätt sedan fritt.",
        "why": "Gör matchtempot mer realistiskt."
      },
      "instructions": {
        "warmup": "Visa rörelsen utan försvar och låt alla prova två korta repetitioner.",
        "main": "Anfall försöker skapa ett snabbt övertag; försvar behöver stoppa boll, skydda korg och därefter ta retur.",
        "conclusion": "Byt roller, avsluta med kort reflektion om beslut och teknik."
      },
      "criteria": [
        "Första tre stegen",
        "Bollstopp",
        "Defensiv retur"
      ],
      "diagramPrompt": "Taktikdiagram för HU15: 4v4 transition stop-and-score. 4v4 över hela planen, två lag roterar direkt efter avslut."
    }
  ]
};
