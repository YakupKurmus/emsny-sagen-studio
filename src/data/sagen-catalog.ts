export interface SagaSection {
  heading?: string | undefined;
  text: string;
}

export interface SagaGlossaryItem {
  term: string;
  explanation: string;
}

export interface SagaComprehensionTask {
  title: string;
  question: string;
  sampleAnswer?: string | undefined;
}

export interface Saga {
  id: string;
  title: string;
  subtitle: string;
  category: "Raum Klagenfurt" | "Heldensagen" | "Ortssagen" | "Nibelungensagen" | "Antike Mythen";
  secondaryCategories: string[];
  region: string;
  readingTimeMin: number;
  wordCount: number;
  summary: string;
  historicalContext: string;
  audioUrl?: string | undefined;
  audioDurationSec?: number | undefined;
  audioTimings?: number[] | undefined;
  audioSpeechSpans?: [number, number][] | undefined;
  glossary?: SagaGlossaryItem[] | undefined;
  comprehensionTasks?: SagaComprehensionTask[] | undefined;
  sections: SagaSection[];
}

export const SAGEN_CATALOG: Saga[] = [
  {
    id: "sage-vom-woertherseemandl",
    title: "Das Wörtherseemandl",
    subtitle: "B2-Niveau • 6. Schulstufe AHS – Mit Original-Hörbuch (MP3) & Wortschatz-Glossar",
    category: "Raum Klagenfurt",
    secondaryCategories: ["Ortssagen", "Raum Klagenfurt"],
    region: "Klagenfurt am Wörthersee (Kärnten)",
    readingTimeMin: 3,
    wordCount: 352,
    summary:
      "Dort, wo heute die Wellen des Wörthersees glitzern, stand einst eine prächtige Stadt voller Übermut. Als die Bürger am Vorabend des Osterfestes die Warnung eines kleinen Männleins verspotteten, öffnete es sein Fässchen und ließ die gesamte Stadt in einer gewaltigen Flut versinken.",
    historicalContext:
      "Aufbereitet für das B2-Niveau (6. Schulstufe AHS) nach den 4 Aufbausteinen der Sage – kombiniert mit dem Original-Hörbuch (MP3), B2-Wortschatz-Glossar und Aufgaben zum Textverständnis inklusive Musterlösungen. An windstillen Tagen sollen der Überlieferung nach die versunkenen Kirchturmspitzen am Grund des Wörthersees schimmern.",
    audioUrl: "/audio/die-sage-vom-woertherseemandl.mp3",
    audioDurationSec: 149.62,
    audioTimings: [
      0.0, 11.28,
      21.65, 28.84, 35.07, 39.5, 44.69, 53.3, 58.65, 62.21, 68.57, 70.57,
      83.71, 87.05, 93.8, 99.17, 102.31, 111.57, 119.07, 124.1, 131.73,
      137.56,
    ],
    audioSpeechSpans: [
      [2.81, 10.69], [11.33, 20.64],
      [21.7, 28.44], [28.89, 34.79], [35.12, 38.12], [39.55, 44.37],
      [44.74, 52.07], [53.35, 58.39], [58.7, 61.94], [62.26, 67.29],
      [68.62, 70.35], [70.62, 82.81],
      [83.76, 86.79], [87.1, 93.26], [93.85, 98.63], [99.22, 101.73],
      [102.36, 110.99], [111.62, 118.63], [119.12, 123.59], [124.15, 131.15],
      [131.78, 137.07], [137.61, 149.33],
    ],
    sections: [
      {
        heading: "1. Die Einführung: Die prächtige Stadt am Wörthersee und der Übermut",
        text:
          "Vor langer Zeit, dort, wo heute die Wellen des Wörthersees glitzern, erstreckte sich eine prächtige und wohlhabende Stadt. Ihre Bewohner führten ein Leben in Saus und Braus, doch mit dem wachsenden Reichtum entwickelte sich auch ein ungeheuerlicher Übermut unter den Bürgern.",
      },
      {
        heading: "2. Das Thema: Das sündige Osterfest und die Warnung des Männleins",
        text:
          "Es war am Vorabend des Osterfestes, einer Zeit, die eigentlich der Besinnung und dem Gebet gewidmet sein sollte. Doch anstatt in die Kirchen zu gehen, veranstalteten die wohlhabenden Bürger ein ausschweifendes Fest. Sie wollten die ganze Nacht hindurch prassen und tanzen. Lautstarke Musik und höhnisches Gelächter drangen aus den hell erleuchteten Palästen. Die Menschen hatten jegliche Ehrfurcht vor der Heiligkeit des Festes verloren und dachten nur an ihren persönlichen Genuss und ihre Gier. Mitten im größten Trubel öffneten sich plötzlich die schweren Tore des Festsaals. Ein winziges, seltsam gekleidetes Männlein trat ein. Es trug ein kleines Fässchen unter dem Arm und blickte streng in die Runde der feiernden Menge. „Wehe euch, ihr Frevler! Verlasst diesen Ort und kehrt um, bevor die Strafe für eure Gottlosigkeit über euch hereinbricht!“, rief das Männlein mit einer Stimme, die trotz seiner geringen Körpergröße den ganzen Saal erzittern ließ.",
      },
      {
        heading: "3. Die Wende: Der Spott der Zecher und die unaufhaltsame Flut",
        text:
          "Doch die Zecher lachten den kleinen Kerl nur aus. Sie verspotteten seine Warnung, bewarfen ihn mit Essensresten und schütteten ihm Wein über sein Gewand. Niemand war bereit, die drohende Gefahr ernst zu nehmen oder sein Verhalten zu ändern. Da verzog das Männlein das Gesicht vor Zorn. Es schritt zur Mitte des Platzes, öffnete mit einer entschlossenen Bewegung den Spund seines Fässchens und ließ das Wasser unaufhaltsam herausfließen. Zuerst war es nur ein kleines Rinnsal, doch binnen weniger Sekunden verwandelte sich der Strom in eine gewaltige, tobende Flut. Das Wasser stieg so rasend schnell an, dass die Menschen keine Chance zur Flucht mehr hatten. Die prächtigen Häuser, die goldenen Türme und die stolzen Bewohner versanken kläglich in den unendlichen Wassermassen. Wo einst eine sündige Stadt gestanden hatte, breitete sich nun ein riesiger, tiefer See aus.",
      },
      {
        heading: "4. Das Bleibende: Der tiefe See und die versunkenen Glocken",
        text:
          "Noch heute erzählen sich die Einheimischen, dass man an besonders windstillen Tagen die Kirchturmspitzen der versunkenen Stadt auf dem Grund des Sees schimmern sehen kann, während die Glocken leise aus der Tiefe heraufklingen.",
      },
    ],
    glossary: [
      {
        term: "der Übermut",
        explanation:
          "Ein Verhalten, bei dem man aus Leichtsinn oder Stolz Risiken eingeht oder Grenzen missachtet.",
      },
      {
        term: "ungeheuerlich",
        explanation: "Außergewöhnlich groß, erschreckend oder empörend.",
      },
      {
        term: "prassen",
        explanation: "Verschwenderisch leben, besonders im Hinblick auf Essen und Trinken.",
      },
      {
        term: "die Ehrfurcht",
        explanation: "Eine Form von großem Respekt, verbunden mit Bewunderung oder Scheu.",
      },
      {
        term: "der Frevler",
        explanation: "Jemand, der gegen religiöse oder moralische Gebote verstößt.",
      },
      {
        term: "der Zecher",
        explanation: "Personen, die ausgiebig Alkohol trinken und feiern.",
      },
      {
        term: "der Zorn",
        explanation: "Ein sehr starkes Gefühl des Ärgers oder der Wut.",
      },
      {
        term: "unaufhaltsam",
        explanation: "Etwas, das nicht gestoppt oder gebremst werden kann.",
      },
      {
        term: "binnen",
        explanation: "Ein zeitlicher Ausdruck für 'innerhalb von'.",
      },
    ],
    comprehensionTasks: [
      {
        title: "1. Ursachen der Zerstörung",
        question:
          "Warum wurde die reiche Stadt laut der Sage zerstört? Nenne die moralischen Gründe.",
        sampleAnswer:
          "Die Stadt wurde zerstört, weil die Bewohner übermütig, gierig und gottlos geworden waren. Anstatt das Osterfest andächtig zu feiern, prassten und feierten sie und missachteten die Warnung des Männleins.",
      },
      {
        title: "2. Rolle des Wörtherseemandls",
        question: "Welche Rolle spielt das 'Wörtherseemandl' in dieser Erzählung?",
        sampleAnswer:
          "Das Männlein fungiert als Warner und später als Vollstrecker einer Strafe. Es verkörpert eine übernatürliche Macht, die das Fehlverhalten der Menschen bestraft, indem es mit seinem magischen Fässchen die Stadt überflutet.",
      },
      {
        title: "3. Realität und Fantasie",
        question:
          "Sagen vermischen oft reale Orte mit fantastischen Elementen. Nenne ein reales und ein fantastisches Merkmal aus diesem Text.",
        sampleAnswer:
          "Ein reales Merkmal ist der Schauplatz, der Wörthersee in Kärnten. Ein fantastisches Merkmal ist das Männlein mit dem unerschöpflichen Wasserfässchen sowie die Vorstellung einer versunkenen Stadt, deren Glocken man heute noch hören kann.",
      },
    ],
  },
  {
    id: "das-ungeheuer-vom-woerthersee-lindwurm",
    title: "Der Lindwurm von Klagenfurt",
    subtitle: "B2-Niveau • 6. Schulstufe AHS – Mit Original-Hörbuch (MP3) & Wortschatz-Glossar",
    category: "Raum Klagenfurt",
    secondaryCategories: ["Heldensagen", "Ortssagen", "Raum Klagenfurt"],
    region: "Klagenfurt am Wörthersee (Kärnten)",
    readingTimeMin: 4,
    wordCount: 489,
    summary:
      "Als das heutige Klagenfurt noch ein unwirtliches Sumpfgebiet zwischen Wörthersee und Drau war, versetzte der schuppige Lindwurm die Gegend in Angst und Schrecken. Auf Initiative von Herzog Karast überlisteten mutige Knechte die Bestie mit einem fetten Stier an einer eisernen Widerhaken-Kette und machten das Land urbar.",
    historicalContext:
      "Aufbereitet für das B2-Niveau (6. Schulstufe AHS) nach den 4 Aufbausteinen der Sage – kombiniert mit dem Original-Hörbuch (MP3), B2-Wortschatz-Glossar und Aufgaben zum Textverständnis inklusive Musterlösungen. Das berühmte Lindwurm-Denkmal auf dem Neuen Platz erinnert bis heute an die Bezwingung des Drachen und das Klagenfurter Wappentier.",
    audioUrl: "/audio/das-ungeheuer-vom-woerthersee-lindwurm.mp3",
    audioDurationSec: 208.66,
    audioTimings: [
      0.0, 12.2, 20.06,
      25.11, 34.4, 41.91, 49.43, 55.37, 61.43, 68.18, 74.85, 87.47, 94.07, 99.06,
      106.35, 110.02, 117.01, 124.46, 130.96, 137.75, 143.53, 154.19, 157.59, 163.29, 174.33, 176.67, 183.67,
      189.57, 197.58,
    ],
    audioSpeechSpans: [
      [0.34, 11.54], [12.25, 19.32], [20.11, 24.49],
      [25.16, 33.75], [34.45, 41.3], [41.96, 48.57], [49.48, 54.83], [55.42, 60.86],
      [61.48, 67.48], [68.23, 74.28], [74.9, 86.68], [87.52, 93.38], [94.12, 98.46], [99.11, 105.64],
      [106.4, 109.25], [110.07, 116.1], [117.06, 123.51], [124.51, 129.91],
      [131.01, 136.82], [137.8, 142.56], [143.58, 153.29], [154.24, 157.36],
      [157.64, 162.37], [163.34, 173.3], [174.38, 176.41], [176.72, 182.91], [183.72, 188.57],
      [189.62, 196.69], [197.63, 208.35],
    ],
    sections: [
      {
        heading: "1. Die Einführung: Die unwirtliche Wildnis zwischen Wörthersee und Drau",
        text:
          "Vor vielen Jahrhunderten, als das heutige Klagenfurt noch eine unwirtliche Wildnis war, erstreckte sich zwischen dem Wörthersee und der Drau ein gewaltiges Sumpfgebiet. Nebelschwaden hingen schwer über den tückischen Mooren, und kaum ein Mensch wagte es, das düstere Dickicht zu betreten. Doch das gefährliche Gelände war nicht das einzige Hindernis für die Besiedlung des Landes.",
      },
      {
        heading: "2. Das Thema: Der schreckliche Lindwurm und die Belohnung des Herzogs",
        text:
          "Im Herzen dieser Sümpfe hauste ein schreckliches Ungeheuer, das die gesamte Gegend in Angst und Schrecken versetzte: der Lindwurm. Mit seinem gepanzerten Schuppenleib, dem giftigen Atem und den riesigen Flügeln war er eine ständige Bedrohung. Er trieb sein Unwesen, indem er weidendes Vieh raubte und sogar unvorsichtige Wanderer in die Tiefe zerrte. Herzog Karast, der über das Land herrschte, wollte dem Morden nicht länger tatenlos zusehen. Er erkannte, dass sein Volk niemals in Frieden leben konnte, solange die Bestie den Sumpf beherrschte. Um das Land urbar zu machen und eine Stadt zu gründen, musste das Monster ein für alle Mal vernichtet werden. Daher ließ der Herzog einen hohen Turm am Rande des Sumpfes errichten, von dem aus man das Gebiet überblicken konnte. Er ließ eine Belohnung verkünden, die für damalige Verhältnisse unvorstellbar war: Wer das Ungeheuer besiegte, sollte das Land ringsum als Lehen erhalten und eine großzügige Entschädigung in Gold empfangen. Doch die tapfersten Ritter zögerten, denn herkömmliche Waffen schienen gegen die dicken Schuppen des Drachen machtlos zu sein. Schließlich erklärten sich einige mutige Knechte bereit, es mit einer List zu versuchen. Sie fertigten eine gewaltige Kette mit einem eisernen Widerhaken an und befestigten daran einen fetten Stier als Köder.",
      },
      {
        heading: "3. Die Wende: Der neblige Morgen und die Bezwingung im Morast",
        text:
          "An einem nebligen Morgen war es so weit. Die Männer versteckten sich im Schutz des Turmes und ließen den Stier am Haken in den Sumpf hinab. Es dauerte nicht lange, bis das Wasser zu brodeln begann und ein durchdringender Gestank die Luft erfüllte. Der Lindwurm war aus seinem Versteck hervorgekommen, angelockt von der leichten Beute. Mit einem gewaltigen Satz stürzte sich die Bestie auf den Stier und verschlang ihn gierig. Doch im selben Moment bohrte sich der eiserne Haken tief in seinen Rachen. Der Lindwurm peitschte wild mit seinem Schwanz um sich und versuchte verzweifelt, sich loszureißen, während die Männer am Turm die Kette mit aller Kraft festhielten. Einer der Knechte rief seinen Gefährten mutig zu: „Haltet stand und lasst die Kette nicht locker, jetzt haben wir die Bestie am Haken!“ Mit vereinten Kräften und schweren Keulen gingen sie zum Angriff über und versetzten dem Ungeheuer den Gnadenstoß, bis es schließlich leblos im Morast versank. Der Jubel war grenzenlos. Da die Gefahr nun gebannt war, konnte der Sumpf trockengelegt und mit dem Bau der Stadt Klagenfurt begonnen werden. Zum Gedenken an diese Heldentat wurde der Lindwurm zum Wappentier der Stadt erkoren.",
      },
      {
        heading: "4. Das Bleibende: Das Lindwurm-Denkmal auf dem Neuen Platz",
        text:
          "Noch heute erinnert das berühmte Lindwurm-Denkmal auf dem Neuen Platz im Herzen Klagenfurts an die Bezwingung des Drachen. Es zeigt das Ungeheuer in seiner ganzen furchteinflößenden Gestalt, gegenüber dem tapferen Herkules, der stellvertretend für die mutigen Männer steht, die einst die Stadt retteten.",
      },
    ],
    glossary: [
      {
        term: "unwirtlich",
        explanation:
          "Eine Umgebung, die ungemütlich ist und in der man kaum überleben kann.",
      },
      {
        term: "Unwesen treiben",
        explanation:
          "Sich auf eine Weise verhalten, die anderen Schaden zufügt oder Unruhe stiftet.",
      },
      {
        term: "urbar machen",
        explanation:
          "Land für die Landwirtschaft oder Besiedlung nutzbar machen (z. B. durch Rodung oder Trockenlegung).",
      },
      {
        term: "Lehen",
        explanation:
          "Landbesitz, den ein Herr seinem Untergebenen für treue Dienste zur Nutzung überlässt.",
      },
      {
        term: "Widerhaken",
        explanation:
          "Ein Haken, der so geformt ist, dass er sich nur schwer wieder herausziehen lässt.",
      },
      {
        term: "Morast",
        explanation: "Tiefer, nasser und schlammiger Boden; ein Sumpf.",
      },
      {
        term: "gebannt",
        explanation: "Eine Gefahr oder Bedrohung ist beseitigt oder abgewendet worden.",
      },
      {
        term: "erkoren",
        explanation: "Gewählt oder ausgesucht (gehoben für 'ausgewählt').",
      },
    ],
    comprehensionTasks: [
      {
        title: "1. Unbesiedelbares Gebiet",
        question:
          "Warum galt das Gebiet um das heutige Klagenfurt ursprünglich als unbesiedelbar?",
        sampleAnswer:
          "Das Gebiet war ein unwirtliches Sumpfgebiet mit gefährlichen Mooren und dichten Nebelschwaden. Zudem hauste dort ein Lindwurm, der Vieh und Menschen angriff und die gesamte Gegend in Angst versetzte.",
      },
      {
        title: "2. List der Knechte",
        question: "Mit welcher List gelang es den Knechten, den Lindwurm zu besiegen?",
        sampleAnswer:
          "Sie benutzten einen fetten Stier als Köder, den sie an einer starken Kette mit einem eisernen Widerhaken befestigten. Als der Lindwurm den Stier fraß, blieb der Haken in seinem Rachen hängen, sodass die Männer ihn festhalten und schließlich mit Keulen töten konnten.",
      },
      {
        title: "3. Merkmale einer Sage",
        question: "Nenne zwei typische Merkmale einer Sage, die in diesem Text vorkommen.",
        sampleAnswer:
          "Erstens bezieht sich die Erzählung auf einen realen Ort (Klagenfurt) und erklärt dessen Entstehung oder ein Wahrzeichen (das Lindwurm-Denkmal/Wappen). Zweitens enthält sie übernatürliche Elemente wie den Lindwurm (einen Drachen), die mit einem historischen Kern vermischt werden.",
      },
    ],
  },
  {
    id: "siegfried-kampf-gegen-das-ungeheuer",
    title: "Siegfried der Drachentöter",
    subtitle: "B2-Niveau • 6. Schulstufe AHS – Mit Original-Hörbuch (MP3) & Wortschatz-Glossar",
    category: "Nibelungensagen",
    secondaryCategories: ["Heldensagen", "Nibelungensagen"],
    region: "Xanten am Niederrhein, Drachenfels & Worms",
    readingTimeMin: 4,
    wordCount: 531,
    summary:
      "Aus den Hallen von Xanten zieht der junge Königssohn Siegfried in die Ferne, schmiedet beim tückischen Schmied Mime das Schwert Balmung und bezwingt am Drachenfels den grausamen Drachen Fafnir. Ein Bad im Drachenblut macht ihn bis auf ein verhängnisvolles Lindenblatt unverwundbar, bevor ihn die Warnung eines Waldvogels vor Mimes Verrat rettet.",
    historicalContext:
      "Aufbereitet für das B2-Niveau (6. Schulstufe AHS) nach den 4 Aufbausteinen der Sage – kombiniert mit dem Original-Hörbuch (MP3), B2-Wortschatz-Glossar und Aufgaben zum Textverständnis inklusive Musterlösungen. Die Sage verknüpft Schauplätze entlang des Rheins (Xanten, Drachenfels, Worms) mit den Motiven des Nibelungenhorts und des Tarnmantels Alberichs.",
    audioUrl: "/audio/siegfried-der-drachentoeter.mp3",
    audioDurationSec: 210.41,
    audioTimings: [
      0.0, 6.95, 16.26, 25.35, 33.15, 40.79,
      51.97, 55.0, 62.5, 71.99, 76.41, 81.44, 89.96,
      100.7, 107.69, 111.1, 119.12, 125.79, 129.69, 134.18, 137.05, 141.45, 146.4, 151.25, 158.26,
      170.2, 176.93, 182.63, 191.29, 200.49,
    ],
    audioSpeechSpans: [
      [0.3, 6.43], [7.0, 15.62], [16.31, 24.49], [25.4, 32.61], [33.2, 40.09], [40.84, 51.22],
      [52.02, 54.43], [55.05, 61.9], [62.55, 71.37], [72.04, 75.64], [76.46, 80.93], [81.49, 89.44], [90.01, 100.2],
      [100.75, 107.22], [107.74, 110.53], [111.15, 118.54], [119.17, 124.84], [125.84, 129.28], [129.74, 133.32], [134.23, 136.55], [137.1, 140.94], [141.5, 145.6], [146.45, 150.77], [151.3, 157.45], [158.31, 169.35],
      [170.25, 176.38], [176.98, 181.93], [182.68, 190.51], [191.34, 199.78], [200.54, 210.17],
    ],
    sections: [
      {
        heading: "1. Die Einführung: Der junge Recke aus Xanten und das Schwert Balmung",
        text:
          "In den prachtvollen Hallen von Xanten am Niederrhein wuchs der junge Königssohn Siegfried heran. Er war nicht nur von außergewöhnlicher Gestalt und Kraft, sondern auch von einem rastlosen Geist beseelt, der ihn nach Ruhm und Abenteuern dürsten ließ. Anstatt ein gemächliches Leben am Hofe zu führen, suchte er die Herausforderung in der Ferne, um sich als würdiger Recke zu beweisen. Seine Reise führte ihn zu dem meisterhaften, aber tückischen Schmied Mime, der tief in einem finsteren Wald lebte. Siegfried verlangte nach einem Schwert, das so scharf und stabil sein sollte, dass es selbst einen Amboss spalten konnte. Nach vielen gescheiterten Versuchen war das mächtige Schwert Balmung fertig geschmiedet, eine Waffe von unvergleichlicher Güte, die in Siegfrieds Händen beinahe lebendig wirkte.",
      },
      {
        heading: "2. Das Thema: Mimes finsterer Plan und der Sieg über den Drachen Fafnir",
        text:
          "Mime jedoch verfolgte einen finsteren Plan. Er stachelte den Jüngling dazu an, den grausamen Drachen Fafnir zu erschlagen, der einen unermesslichen Hort bewachte. In Wahrheit hoffte der Schmied, dass Siegfried im Kampf fallen würde oder er ihn danach durch eine List umbringen könnte, um den Schatz für sich allein zu beanspruchen. Siegfried, von Wagemut getrieben, ahnte nichts von diesem Verrat. Am Drachenfels angekommen, stellte sich Siegfried der furchteinflößenden Bestie. Fafnir spie Feuer und Galle, doch der junge Held wich geschickt aus und stieß Balmung mit gewaltiger Kraft mitten in das Herz des Ungeheuers. Das Blut des Drachen ergoss sich in einem heißen Strom über den Boden, und Siegfried, der von der Legende um die Unverwundbarkeit des Drachenblutes wusste, entschloss sich zu einem folgenschweren Bad.",
      },
      {
        heading:
          "3. Die Wende: Das Lindenblatt, die Warnung des Waldvogels und der Nibelungenschatz",
        text:
          "Er entledigte sich seiner Rüstung und tauchte seinen Körper in das dampfende Blut, wodurch seine Haut hart wie Horn wurde. Kein Schwert und kein Speer sollten ihn fortan verletzen können. Doch während er im Blut badete, segelte lautlos ein Lindenblatt von einem Baum herab und legte sich genau zwischen seine Schulterblätter. Diese winzige Stelle blieb von der Flüssigkeit unberührt und sollte seine einzige verwundbare Stelle bleiben. Plötzlich vernahm Siegfried eine Stimme aus den Baumwipfeln. Ein kleiner Waldvogel zwitscherte eine eindringliche Warnung herab: „Hüte dich, edler Recke, vor dem falschen Schmied! Mime trachtet dir nach dem Leben, sobald du den Schatz aus der Höhle birgst. Er ist von Habgier zerfressen und wird dich hinterrücks mit Gift niederstrecken!“ Erschüttert über den Verrat seines Lehrmeisters, stellte Siegfried Mime zur Rede. Als dieser versuchte, den Mordplan zu leugnen, erkannte der Held die Tücke in den Augen des Schmieds und erschlug ihn. Nun war Siegfried nicht nur der Bezwinger des Drachen, sondern auch der alleinige Besitzer des Nibelungenschatzes, zu dem auch der Tarnmantel des Zwerges Alberich gehörte, der seinen Träger unsichtbar machen konnte.",
      },
      {
        heading: "4. Das Bleibende: Der Zug nach Worms und die Sage am Rhein",
        text:
          "Beladen mit Gold und Edelsteinen zog Siegfried weiter nach Worms am Rhein, wo die stolzen Burgunderkönige herrschten. Sein Ruf eilte ihm voraus, und man empfing ihn mit einer Mischung aus Bewunderung und Misstrauen. Er wusste zu diesem Zeitpunkt noch nicht, dass der Schatz einen uralten Fluch in sich trug, der jedem Besitzer früher oder später das Unheil bringen würde. Trotz seiner unbezwingbar erscheinenden Kraft blieb Siegfried ein Mensch, dessen Schicksal durch die Liebe zu Kriemhild und den Neid der Mächtigen besiegelt werden sollte. Die Sage von seinem Sieg über den Drachen wird jedoch ewig als Beispiel für Mut und menschliche Verletzlichkeit fortbestehen, eingebettet in die nebelverhangene Landschaft des Rheins.",
      },
    ],
    glossary: [
      {
        term: "Recke",
        explanation: "Ein veraltetes Wort für einen tapferen, heldenhaften Krieger.",
      },
      {
        term: "geschmiedet",
        explanation: "Durch Erhitzen und Hämmern von Metall in eine bestimmte Form gebracht.",
      },
      {
        term: "List",
        explanation: "Ein klug durchdachter Plan, um jemanden zu täuschen oder zu überrumpeln.",
      },
      {
        term: "Wagemut",
        explanation: "Die Bereitschaft, trotz großer Gefahr mutig zu handeln.",
      },
      {
        term: "verwundbar",
        explanation: "Angreifbar oder verletzlich an einer bestimmten Stelle.",
      },
      {
        term: "Habgier",
        explanation: "Das übersteigerte Verlangen, immer mehr Besitz oder Geld anzuhäufen.",
      },
      {
        term: "Tücke",
        explanation: "Eine verborgene Bosheit oder eine gefährliche Hinterhältigkeit.",
      },
      {
        term: "unbezwingbar",
        explanation: "So stark oder mächtig, dass man nicht besiegt werden kann.",
      },
    ],
    comprehensionTasks: [
      {
        title: "1. Unverwundbarkeit und Schwachstelle",
        question:
          "Wie erlangte Siegfried seine körperliche Unverwundbarkeit und warum war er dennoch nicht am gesamten Körper geschützt?",
        sampleAnswer:
          "Siegfried badete im Blut des getöteten Drachen Fafnir, wodurch seine Haut hart wie Horn wurde. Er war jedoch nicht überall geschützt, weil während des Bades ein Lindenblatt auf seinen Rücken fiel. An dieser Stelle zwischen den Schulterblättern berührte das Blut seine Haut nicht, weshalb er dort verwundbar blieb.",
      },
      {
        title: "2. Rolle und Ziel des Schmieds Mime",
        question: "Welche Rolle spielt der Schmied Mime in der Erzählung und was war sein wahres Ziel?",
        sampleAnswer:
          "Mime war Siegfrieds Lehrmeister, der ihm das Schwert Balmung schmiedete. Er handelte jedoch aus Eigennutz und Tücke. Sein wahres Ziel war es, Siegfried zu benutzen, um den Drachen zu töten und danach Siegfried selbst zu ermorden, damit er den Schatz der Nibelungen für sich allein besitzen konnte.",
      },
      {
        title: "3. Typische Merkmale einer Sage",
        question:
          "Sagen enthalten oft fantastische Elemente, die mit realen Orten verknüpft sind. Nenne ein Merkmal aus dem Text, das typisch für eine Sage ist.",
        sampleAnswer:
          "Typisch für eine Sage ist die Verknüpfung von realen Orten (wie Xanten oder Worms am Rhein) mit übernatürlichen Wesen und magischen Gegenständen. In dieser Geschichte sind der sprechende Waldvogel, der feuerspeiende Drache, der unsichtbar machende Tarnmantel und die beinahe magische Unverwundbarkeit durch Drachenblut klare fantastische Sagenmerkmale.",
      },
    ],
  },
  {
    id: "der-steinerne-fischer-vom-woerthersee",
    title: "Der steinerne Fischer vom Wörthersee",
    subtitle: "B2-Niveau • 6. Schulstufe AHS – Mit Original-Hörbuch (MP3) & Wortschatz-Glossar",
    category: "Raum Klagenfurt",
    secondaryCategories: ["Ortssagen", "Raum Klagenfurt"],
    region: "Klagenfurt am Wörthersee (Kärnten)",
    readingTimeMin: 4,
    wordCount: 500,
    summary:
      "Ein unermüdlicher, doch geiziger Fischer aus Klagenfurt missachtet am Sonntagmorgen das Läuten der Domglocken und verspottet die Warnung eines alten Nachbarn. Draußen auf dem Wörthersee zieht er einen riesigen Felsbrocken ins Netz – und erstarrt unter Blitz und Donner zur ewigen Mahnung in Stein.",
    historicalContext:
      "Aufbereitet für das B2-Niveau (6. Schulstufe AHS) nach den 4 Aufbausteinen der Sage – kombiniert mit dem Original-Hörbuch (MP3), B2-Wortschatz-Glossar und Aufgaben zum Textverständnis inklusive Musterlösungen. Das steinerne Denkmal des Fischers in Klagenfurt gilt als mahnendes Zeugnis gegen Geiz, Hochmut und den Bruch der Feiertagsruhe.",
    audioUrl: "/audio/der-steinerne-fischer-vom-woerthersee.mp3",
    audioDurationSec: 207.58,
    audioTimings: [
      0.0, 17.91, 26.07,
      32.64, 42.59, 46.05, 55.38, 64.05, 69.14, 74.55, 77.37, 84.15, 87.01, 89.44,
      95.69, 101.13, 106.61, 115.83, 119.14, 125.89, 129.5, 136.22, 141.28, 146.7, 156.46, 158.54, 162.51, 167.11, 177.04, 185.59,
      193.35, 198.9,
    ],
    audioSpeechSpans: [
      [4.31, 17.14], [17.96, 25.8], [26.12, 31.62],
      [32.69, 42.33], [42.64, 45.94], [46.1, 54.45], [55.43, 63.37], [64.1, 68.64], [69.19, 73.64],
      [74.6, 77.05], [77.42, 83.85], [84.2, 86.71], [87.06, 89.23], [89.49, 94.69],
      [95.74, 100.79], [101.18, 105.81], [106.66, 114.99], [115.88, 118.86], [119.19, 125.23],
      [125.94, 129.28], [129.55, 135.5], [136.27, 140.65], [141.33, 145.89], [146.75, 155.34],
      [156.51, 158.3], [158.59, 161.83], [162.56, 166.88], [167.16, 176.23], [177.09, 185.11], [185.64, 192.43],
      [193.4, 198.3], [198.95, 207.55],
    ],
    sections: [
      {
        heading: "1. Die Einführung: Der rastlose und geizige Fischer am Wörthersee",
        text:
          "In längst vergangenen Zeiten, als der Wörthersee noch viel fischreicher war als heute, lebte in Klagenfurt ein Fischer, der für seinen unermüdlichen Eifer, aber auch für seinen Geiz bekannt war. Während seine Nachbarn die Sonn- und Feiertage ehrten und gemeinsam zur Kirche pilgerten, kannte dieser Mann keine Rast. Sein einziges Trachten galt dem Fang und dem Profit, den er auf dem Markt erzielen konnte.",
      },
      {
        heading: "2. Das Thema: Der Frevel am Sonntagmorgen und die Warnung des Nachbarn",
        text:
          'An einem strahlenden Sonntagmorgen, als die Glocken des Klagenfurter Doms feierlich zum Gottesdienst riefen, rüstete sich der Fischer erneut für die Ausfahrt. Die Bewohner der Stadt schüttelten missbilligend die Köpfe. Es galt als schwerer Frevel, die Sonntagsruhe für weltliche Arbeit zu brechen, doch den gierigen Mann kümmerte die allgemeine Meinung wenig. Als er sein Boot gerade vom Ufer abstoßen wollte, trat ein alter Nachbar an ihn heran und legte ihm besorgt die Hand auf die Schulter. Er versuchte, den Fischer von seinem Vorhaben abzubringen, da er Unheil witterte. Doch der Fischer lachte nur hämisch und stieß den Greis unsanft beiseite. "Hüte dich vor dem Zorn des Himmels, Fischer! Wer am Tag des Herrn das Netz auswirft, fängt nichts als Verderben!", rief der Alte mit zitternder Stimme. Doch der Fischer entgegnete nur spöttisch: "Eure Gebete füllen meinen Magen nicht! Ich werde heute den größten Fang meines Lebens machen, und kein Gott wird mich daran hindern!"',
      },
      {
        heading: "3. Die Wende: Der Felsbrocken im Netz und die Versteinerung am Ufer",
        text:
          "Mit kräftigen Ruderschlägen steuerte er sein Boot weit hinaus auf den spiegelglatten See. Die Stille des Morgens wurde nur durch das rhythmische Eintauchen der Ruder unterbrochen. Schließlich warf er sein großes Netz aus und wartete voller Ungeduld auf den vermeintlich großen Reichtum, den er aus der Tiefe zu bergen hoffte. Plötzlich ruckte es gewaltig an den Seilen. Das Boot schwankte bedrohlich, und der Fischer musste all seine Kraft aufbieten, um nicht über Bord zu gehen. Mit funkelnden Augen zog er das Netz langsam empor. Es war so schwer, dass er glaubte, einen riesigen Wels oder gar einen Schatz gehoben zu haben. Doch als das Netz die Wasseroberfläche durchbrach, geschah das Unfassbare. Statt zappelnder Fische befand sich darin ein riesiger, grauer Felsbrocken. In diesem Moment verdunkelte sich der Himmel, ein Blitz zuckte herab, und ein Donnern erschütterte die Luft, obwohl keine Wolke zu sehen gewesen war. Der Fischer erstarrte vor Schreck. Er wollte flüchten, doch seine Beine gehorchten ihm nicht mehr. Eine eisige Kälte kroch von den Zehenspitzen aufwärts durch seinen ganzen Körper. Seine Haut wurde grau und hart, seine Kleidung verwandelte sich in sprödes Gestein, und sein entsetzter Gesichtsausdruck blieb für immer in Stein gemeißelt. Am nächsten Morgen fanden Passanten kein Boot auf dem See, sondern eine steinerne Figur am Ufer, die genau die Züge des gierigen Fischers trug. Er war zur ewigen Mahnung für alle geworden, die den Feiertag missachten und den Geiz über die Ehrfurcht vor dem Göttlichen stellen.",
      },
      {
        heading: "4. Das Bleibende: Der versteinerte Fischer in Klagenfurt",
        text:
          "Noch heute steht der versteinerte Fischer in Klagenfurt und erinnert die Menschen an die alte Geschichte. Er ist ein stummes Zeugnis dafür, dass Hochmut und die Missachtung alter Traditionen oft einen hohen Preis fordern, der nicht mit Gold aufgewogen werden kann.",
      },
    ],
    glossary: [
      {
        term: "unermüdlich",
        explanation: "Ohne müde zu werden; mit sehr viel Ausdauer und Energie.",
      },
      {
        term: "der Frevel",
        explanation: "Ein Verstoß gegen eine religiöse oder moralische Ordnung.",
      },
      {
        term: "hämisch",
        explanation: "Schadenfroh und boshaft zugleich.",
      },
      {
        term: "vermeintlich",
        explanation:
          "Etwas, das man nur glaubt oder annimmt, das aber in Wirklichkeit nicht so ist.",
      },
      {
        term: "bergen",
        explanation: "Etwas aus einer gefährlichen Lage oder aus dem Wasser herausholen und sichern.",
      },
      {
        term: "die Mahnung",
        explanation:
          "Eine eindringliche Erinnerung oder Warnung, etwas Bestimmtes zu tun oder zu lassen.",
      },
      {
        term: "versteinert",
        explanation: "Zu Stein geworden; im übertragenen Sinne auch: vor Schreck unbeweglich.",
      },
      {
        term: "der Hochmut",
        explanation: "Überheblichkeit oder Stolz; wenn man sich für besser hält als andere.",
      },
    ],
    comprehensionTasks: [
      {
        title: "1. Gründe der Bestrafung",
        question: "Warum wurde der Fischer laut der Sage bestraft?",
        sampleAnswer:
          "Der Fischer wurde bestraft, weil er gierig war und die Sonntagsruhe missachtete. Er weigerte sich, am Tag des Herrn zu ruhen, verspottete die Warnungen seines Nachbarn und stellte seinen Profit über religiöse Traditionen.",
      },
      {
        title: "2. Typische Sagenmerkmale",
        question: "Nenne drei typische Merkmale einer Sage, die in diesem Text vorkommen.",
        sampleAnswer:
          "1. Realer Schauplatz (Klagenfurt / Wörthersee). 2. Übernatürliche Ereignisse (die Verwandlung in Stein). 3. Ein moralischer Kern bzw. eine Warnung (Bestrafung von Gier und Gotteslästerung).",
      },
      {
        title: "3. Reaktion auf die Warnung",
        question: "Wie reagierte der Fischer auf die Warnung des alten Nachbarn?",
        sampleAnswer:
          "Der Fischer reagierte respektlos und arrogant. Er lachte hämisch, stieß den alten Mann beiseite und spottete darüber, dass Gebete seinen Magen nicht füllen würden.",
      },
    ],
  },
  {
    id: "daedalus-ikarus",
    title: "Dädalus und Ikarus",
    subtitle: "B2-Niveau • 6. Schulstufe AHS – Mit Original-Hörbuch (MP3) & Wortschatz-Glossar",
    category: "Antike Mythen",
    secondaryCategories: ["Heldensagen", "Antike Mythen"],
    region: "Athen, Kreta & die Insel Ikaria (Griechenland)",
    readingTimeMin: 3,
    wordCount: 355,
    summary:
      "Der berühmte Handwerker Dädalus muss wegen des Mordes an seinem Lehrling Talos aus Athen nach Kreta fliehen. Als er dort beim König Minos in Ungnade fällt, baut er für sich und seinen Sohn Ikarus Flügel aus Federn und Wachs – doch Ikarus wird übermütig, vergisst die Warnung seines Vaters und stürzt ins Meer.",
    historicalContext:
      "Aufbereitet für das B2-Niveau (6. Schulstufe AHS) nach den 4 Aufbausteinen der Sage – kombiniert mit dem Original-Hörbuch (MP3), B2-Wortschatz-Glossar und Aufgaben zum Textverständnis inklusive Musterlösungen. Die griechische Insel Ikaria erhielt der Sage nach ihren Namen zum Gedenken an Ikarus.",
    audioUrl: "/audio/daedalus-und-ikarus.mp3",
    audioDurationSec: 149.38,
    audioTimings: [
      0.0, 13.88, 19.7, 23.11, 25.91, 29.33, 35.91, 41.89, 45.31,
      50.0, 55.54, 60.12, 65.72, 71.62, 76.4, 80.44, 82.11, 86.52,
      91.01, 96.99, 103.28, 113.03, 117.9, 118.89, 122.14,
      124.23, 132.21, 135.46, 143.54, 146.59,
    ],
    audioSpeechSpans: [
      [4.17, 12.19], [13.88, 19.06], [19.7, 22.25], [23.11, 25.27], [25.91, 28.66], [29.33, 34.83], [35.91, 41.0], [41.89, 44.63], [45.31, 48.88],
      [50.0, 54.72], [55.54, 59.0], [60.12, 64.86], [65.72, 70.44], [71.62, 75.51], [76.4, 79.91], [80.44, 81.65], [82.11, 85.85], [86.52, 89.76],
      [91.01, 96.21], [96.99, 102.33], [103.28, 111.5], [113.03, 117.25], [117.9, 118.57], [118.89, 121.84], [122.14, 123.39],
      [124.23, 130.9], [132.21, 135.17], [135.46, 142.75], [143.54, 146.07], [146.59, 148.97],
    ],
    sections: [
      {
        heading: "1. Die Einführung: Flucht aus Athen nach Kreta",
        text:
          "Der berühmte Handwerker Dädalus musste aus seiner Vaterstadt Athen fliehen, weil er seinen Lehrling Talos aus Neid getötet hatte.\n\nTalos war selbst schon als Knabe seinem Meister an Geschicklichkeit und Einfallsreichtum überlegen. Er hatte die Töpferscheibe und die Säge erfunden. Deshalb war er in ganz Athen berühmt. Das konnte der eifersüchtige Dädalus nicht ertragen. Er führte den Jungen auf das Dach des Tempels der Göttin Pallas Athene und stürzte ihn in die Tiefe. Dädalus wurde wegen dieses Mordes verfolgt, aber es gelang ihm, auf die Insel Kreta zu fliehen. Einige Jahre lebte er dort mit seinem Sohn Ikarus. Er arbeitete am Hof des Königs Minos und errang großes Ansehen.",
      },
      {
        heading: "2. Das Thema: Gefangenschaft und Fluchtplan",
        text:
          "Eines Tages fiel er beim König in Ungnade und wurde mit seinem Sohn ins Gefängnis geworfen. Alle Schiffe wurden bewacht, und es war schwer, von der Insel zu fliehen. Da kam Dädalus auf den Gedanken, für sich und Ikarus Flügel aus Federn herzustellen. Die großen Federn befestigte er mit Fäden, die kleineren wurden mit Wachs zusammengehalten.\n\nBevor sie sich in die Lüfte erhoben, warnte Dädalus seinen Sohn eindringlich: „Ikarus, halte dich immer in der Mitte zwischen den Wellen und der Sonne! Folge immer mir nach! Fliege nicht zu hoch, sonst würde das Wachs der Flügel in der Sonne schmelzen! Und fliege nicht zu tief, da dann die Wellen die Flügel durchnässen!“",
      },
      {
        heading: "3. Die Wende: Übermut und Absturz ins Meer",
        text:
          "Die Flügel waren so kunstvoll, dass sich beide tatsächlich in die Lüfte erhoben. Da wurde der junge Ikarus übermütig und flog immer höher hinauf zur Sonne. Ehe Ikarus es merkte, schmolz das Wachs, das die Federn zusammenhielt, in der Sonne und er stürzte hinab in die Tiefe.\n\nAls Dädalus sich umschaute, konnte er seinen Sohn nirgends entdecken. „Ikarus! Ikarus!“, rief er voller Verzweiflung: „Wo soll ich dich nur suchen?“",
      },
      {
        heading: "4. Das Bleibende: Das Grab auf der Insel Ikaria",
        text:
          "Da endlich sah er einige Federn, die auf dem Wasser trieben, und erkannte, dass das Meer seinen Sohn verschlungen hatte. Das Herz voll von Trauer flog Dädalus an Land. Er legte die Flügel ab und irrte am Ufer der kleinen Insel umher, bis die Wellen den toten Ikarus an den Strand spülten. Dort begrub der Vater den geliebten Sohn. Der Insel gab er den Namen Ikaria.",
      },
    ],
    glossary: [
      {
        term: "Einfallsreichtum",
        explanation: "Die Fähigkeit, viele kreative und neue Ideen zu haben.",
      },
      {
        term: "überlegen sein",
        explanation: "Besser, klüger oder geschickter als jemand anderes sein.",
      },
      {
        term: "Ansehen",
        explanation:
          "Die Wertschätzung oder der Respekt, den andere einer Person entgegenbringen.",
      },
      {
        term: "in Ungnade fallen",
        explanation:
          "Wenn man die Gunst oder das Vertrauen einer mächtigen Person (z.B. eines Königs) verliert.",
      },
      {
        term: "befestigen",
        explanation: "Etwas so anbringen, dass es fest hält.",
      },
      {
        term: "eindringlich",
        explanation: "Sehr deutlich, mit Nachdruck und ernsthaft.",
      },
      {
        term: "übermütig",
        explanation: "Leichtsinnig oder tollkühn durch zu viel Selbstvertrauen.",
      },
      {
        term: "verschlingen",
        explanation:
          "Etwas gänzlich in sich aufnehmen oder gewaltsam hinunterschlucken.",
      },
      {
        term: "umherirren",
        explanation:
          "Ohne festes Ziel oder orientierungslos hin und her wandern.",
      },
    ],
    comprehensionTasks: [
      {
        title: "1. Flucht aus Athen",
        question: "Warum musste Dädalus aus seiner Heimatstadt Athen fliehen?",
        sampleAnswer:
          "Dädalus musste aus Athen fliehen, weil er seinen Lehrling Talos aus Neid getötet hatte. Talos war so geschickt und erfinderisch, dass Dädalus eifersüchtig auf dessen Berühmtheit wurde.",
      },
      {
        title: "2. Anweisungen vor dem Flug",
        question:
          "Welche lebenswichtigen Anweisungen gab Dädalus seinem Sohn vor dem Flug?",
        sampleAnswer:
          "Er warnte Ikarus, immer in der Mitte zwischen den Wellen und der Sonne zu fliegen. Er durfte nicht zu hoch fliegen, da sonst das Wachs in der Sonne schmelzen würde, und nicht zu tief, damit die Wellen die Federn nicht nass machen.",
      },
      {
        title: "3. Benennung der Insel Ikaria",
        question: "Wie erklärt die Sage die Benennung der Insel Ikaria?",
        sampleAnswer:
          "Die Insel erhielt ihren Namen von Dädalus zum Gedenken an seinen Sohn Ikarus. Er begrub dort den Leichnam seines Sohnes, nachdem dieser ins Meer gestürzt und an den Strand gespült worden war.",
      },
    ],
  },
  {
    id: "drachenhoehle-mixnitz",
    title: "Die Drachenhöhle bei Mixnitz",
    subtitle: "B2-Niveau • 6. Schulstufe AHS – Mit Original-Hörbuch (MP3) & Wortschatz-Glossar",
    category: "Ortssagen",
    secondaryCategories: ["Heldensagen", "Ortssagen"],
    region: "Mixnitz / Röthelstein & Pernegg im Murtal (Steiermark)",
    readingTimeMin: 3,
    wordCount: 416,
    summary:
      "In den Felswänden des Röthelsteins bei Mixnitz haust einst ein gewaltiger Drache, der Menschen, Rinder und sogar den Halterbuben reißt. Als alle Männer vor dem Ungetüm fliehen, ersinnt der kluge Ziehsohn eines Bauern aus Pernegg eine gefährliche List in der Rinne zum Mixnitzbach.",
    historicalContext:
      "Aufbereitet für das B2-Niveau (6. Schulstufe AHS) nach den 4 Aufbausteinen der Sage – kombiniert mit dem Original-Hörbuch (MP3), B2-Wortschatz-Glossar und Aufgaben zum Textverständnis inklusive Musterlösungen. Die im Volksmund auch „Kogellucken“ genannte Drachenhöhle liegt bei Mixnitz am linken Murufer im Bergstock des Röthelsteins.",
    audioUrl: "/audio/die-drachenhoehle-bei-mixnitz.mp3",
    audioDurationSec: 169.49,
    audioTimings: [
      0.0, 10.59, 14.85, 22.1,
      27.82, 32.58, 38.01, 43.33, 46.99, 50.86, 56.52, 59.29, 62.45, 66.21, 70.49,
      82.68, 87.79, 99.84, 110.45, 115.81, 123.83, 134.65, 139.87,
      146.46, 152.74, 157.47, 160.05, 164.64,
    ],
    audioSpeechSpans: [
      [3.7, 10.06], [10.59, 14.02], [14.85, 21.38], [22.1, 26.67],
      [27.82, 31.95], [32.58, 37.16], [38.01, 42.52], [43.33, 46.42], [46.99, 50.28], [50.86, 55.64], [56.52, 58.98], [59.29, 61.58], [62.45, 65.54], [66.21, 69.84], [70.49, 81.83],
      [82.68, 86.96], [87.79, 98.92], [99.84, 109.64], [110.45, 115.22], [115.81, 122.99], [123.83, 133.81], [134.65, 139.04], [139.87, 144.85],
      [146.46, 152.12], [152.74, 156.8], [157.47, 159.27], [160.05, 163.89], [164.64, 169.23],
    ],
    sections: [
      {
        heading: "1. Die Einführung: Die Höhle am Röthelstein und der Drache",
        text:
          "Bei Mixnitz sieht man am linken Murufer in den Felswänden des Röthelsteins den Eingang zu einer Höhle. Im Volksmund heißt sie „Kogellucken“ oder „Drachenhöhle“. Einst hauste in dieser Höhle ein riesengroßer Drache mit einem dicken Schuppenpanzer und gewaltigen Flügeln. Er richtete viel Unheil an, denn er zerriss und verschlang Menschen und Tiere.",
      },
      {
        heading: "2. Das Thema: Der Bauer von Pernegg und der Plan des Ziehsohns",
        text:
          "Ein Bauer aus Pernegg besaß am Mixnitzbach einen großen Bauernhof. Eines Tages raubte der Drache zwei Rinder des Bauern und tötete den Halterbuben. Da versprach der Bauer demjenigen eine hohe Belohnung, der den Drachen töten würde. Viele furchtlose Männer zogen aus, das Untier zu töten. Viele kehrten aber wieder um, sobald sie den Drachen brüllen hörten. Manche kamen schwer verletzt ins Tal zurück und manche fanden vor der Höhle den Tod. Die Furcht vor dem Drachen wurde immer größer. Mägde und Knechte verließen den Bauernhof.\n\nDa entschloss sich der Ziehsohn des Bauern, den Drachen zu töten. Der starke Bursche wusste, dass er den Drachen nur mit List besiegen konnte. Bei all seinen Überlegungen entdeckte er, dass sich der Drache von seiner Höhle bis zum Mixnitzbach eine steinfreie Rinne ausgewälzt hatte, damit er sich beim Herabrutschen nicht seinen schuppenfreien Bauch verletzte.",
      },
      {
        heading: "3. Die Wende: Die Falle in der Rinne und das Ende des Untiers",
        text:
          "Vorsichtig begab sich der Bursche in den Abendstunden zur Rinne. Dort grub er heimlich, damit ihn der Drache nicht sah, Hacken, Sensen, Gabeln und Sicheln so ein, dass die scharfen Spitzen und Schneiden aus dem Boden herausragten. Er war kaum fertig mit seinem Werk, da kam der Drache brüllend und schnaubend aus der Höhle und wälzte sich in der Rinne, um im Mixnitzbach seinen Durst stillen zu können. Doch die spitzen und scharfen Hacken, Sensen und Sicheln rissen seinen Bauch auf. Der Drache bäumte sich vor Schmerzen auf und heulte so furchtbar, dass es der Bursche in seinem Versteck mit der Angst zu tun bekam. Je mehr der Drache mit seinen Flügeln herumschlug und tobte, desto mehr verhakten sich die spitzen Sensen, Gabeln, Hacken und Sicheln und schnitten dem Ungetüm den Bauch auf. Mit seinem Schwanz schlug das Tier Bäume um und Felsblöcke lösten sich aus der Wand. Schließlich rollte es sich zu einem Klumpen zusammen und kugelte tödlich verletzt ins Tal.",
      },
      {
        heading: "4. Das Bleibende: Der Lohn und die Befreiung des Murtals",
        text:
          "Groß war die Freude der Bewohner, als sie erfuhren, dass der gefürchtete Feind unschädlich gemacht worden war. Von weit und breit eilten die Leute herbei und bestaunten den toten Drachen. Er wurde tief in der Erde verscharrt. Der Bauer schenkte dem klugen und furchtlosen Burschen den schönen Meierhof. Alle waren stolz auf ihn und feierten ihn als Retter und Befreier des Murtals.",
      },
    ],
    glossary: [
      {
        term: "Volksmund",
        explanation:
          "Die Art und Weise, wie die Menschen in einer bestimmten Region oder im Alltag etwas nennen.",
      },
      {
        term: "Schuppenpanzer",
        explanation:
          "Eine harte, schützende Außenschicht aus Schuppen, die den Körper von Reptilien oder Fabelwesen bedeckt.",
      },
      {
        term: "Halterbube",
        explanation:
          "Ein Junge, der früher die Aufgabe hatte, das Vieh (z. B. Rinder) auf der Weide zu hüten und zu bewachen.",
      },
      {
        term: "Ziehsohn",
        explanation:
          "Ein Kind, das nicht das eigene leibliche Kind ist, aber wie ein eigenes Familienmitglied aufgezogen wurde.",
      },
      {
        term: "Rinne",
        explanation:
          "Eine natürliche oder künstliche Vertiefung im Boden, die wie eine Rutsche oder ein Graben wirkt.",
      },
      {
        term: "schnaubend",
        explanation:
          "Mit lautem Geräusch durch die Nase ausatmen, was oft ein Zeichen von Wut oder Anstrengung ist.",
      },
      {
        term: "Ungetüm",
        explanation:
          "Ein großes, unheimliches und furchteinflößendes Wesen; ein Monster.",
      },
      {
        term: "verscharrt",
        explanation:
          "Etwas (meist ein Lebewesen) eilig und ohne große Zeremonie in der Erde vergraben.",
      },
      {
        term: "Meierhof",
        explanation:
          "Ein großer, oft landwirtschaftlich bedeutender Bauernhof, der ursprünglich einem Verwalter (Meier) gehörte.",
      },
    ],
    comprehensionTasks: [
      {
        title: "1. Entscheidende Beobachtung",
        question:
          "Welche Beobachtung des Burschen war entscheidend für seinen Plan, den Drachen zu besiegen?",
        sampleAnswer:
          "Der Bursche bemerkte, dass der Drache eine steinfreie Rinne benutzte, um zum Bach zu gelangen. Er erkannte, dass der Drache dort seinen verletzlichen, schuppenfreien Bauch schonen wollte. Diesen Weg nutzte er als Falle.",
      },
      {
        title: "2. Scheitern der anderen Männer",
        question:
          "Warum scheiterten die anderen Männer, die vor dem Ziehsohn versucht hatten, den Drachen zu töten?",
        sampleAnswer:
          "Die anderen Männer versuchten es vermutlich mit roher Gewalt statt mit List. Viele bekamen es mit der Angst zu tun, sobald sie das Brüllen des Drachen hörten. Manche wurden schwer verletzt oder fanden vor der Höhle sogar den Tod.",
      },
      {
        title: "3. Lohn für die Heldentat",
        question: "Wie wird der Bursche am Ende der Sage für seine Heldentat belohnt?",
        sampleAnswer:
          "Der Bursche erhält vom Bauern als Dank für die Befreiung den wertvollen Meierhof geschenkt. Zudem wird er von den Bewohnern des gesamten Murtals als Retter und Befreier gefeiert und geehrt.",
      },
    ],
  },
];

export const SAGA_CATEGORIES = [
  "Alle",
  "Raum Klagenfurt",
  "Heldensagen",
  "Ortssagen",
  "Nibelungensagen",
  "Antike Mythen",
] as const;

export type SagaCategory = (typeof SAGA_CATEGORIES)[number];
