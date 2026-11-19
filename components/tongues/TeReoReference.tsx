'use client'
import React from 'react'
import { DIALOGUES } from '@/lib/tongues/te-reo-dialogues'

// Grammar reference. Each RefSection carries a title; pass `only` to show a subset
// (topics show their own sections), or nothing for the full A to Z.
export default function TeReoReference({ only }: { only?: string[] }) {
  const all = (
    <>

          <RefSection title="Greetings & basics" note="Use tēnā koe / kōrua / koutou for formal settings depending on how many people you're addressing. Kia ora works everywhere, any number.">
            <RefTable rows={[
              ['kia ora', 'hello / thank you'],
              ['tēnā koe', 'greetings (to one)'],
              ['tēnā kōrua', 'greetings (to two)'],
              ['tēnā koutou', 'greetings (to three+)'],
              ['nau mai', 'welcome'],
              ['haere rā', 'goodbye (to someone leaving)'],
              ['e noho rā', 'goodbye (said by the one leaving)'],
              ['āe', 'yes'],
              ['kāo', 'no'],
              ['mōrena', 'good morning'],
              ['pō mārie', 'good night'],
              ['haere mai', 'come here / welcome'],
              ['tēnā tātou katoa', 'greetings to us all'],
              ['hongi', 'a nose-to-nose greeting'],
              ['harirū', 'a handshake'],
              ['pea', 'maybe / perhaps'],
              ['koia', "that's right / correct"],
              ['ka pai', 'okay / all right'],
              ['koia rā?', 'really? / is that so?'],
              ['anā', 'there it is / behold'],
            ]} />
          </RefSection>

          <RefSection title="Pronouns" note="Te reo has singular, dual (two people), and plural (three+), plus inclusive vs exclusive 'we'. Green = speaker, blue = listener, gray = others.">
            <PronounSVG />
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
              <thead><tr><th style={thStyle}>Te Reo</th><th style={thStyle}>English</th><th style={thStyle}>Type</th></tr></thead>
              <tbody>
                {[['au','I / me','singular'],['koe','you (one)','singular'],['ia','he/she/they (one)','singular'],
                  ['tāua','we two, incl you','dual'],['māua','we two, excl you','dual'],
                  ['kōrua','you two','dual'],['rāua','they two','dual'],
                  ['tātou','we all, incl you','plural'],['mātou','we (3+), excl you','plural'],
                  ['koutou','you all (3+)','plural'],['rātou','they (3+)','plural'],
                ].map(([tr,en,type],i) => (
                  <tr key={i}><td style={i%2===0?tdStyle:tdAltStyle}>{tr}</td><td style={i%2===0?tdStyle:tdAltStyle}>{en}</td><td style={{...(i%2===0?tdStyle:tdAltStyle),fontSize:13,color:'var(--soft)'}}>{type}</td></tr>
                ))}
              </tbody>
            </table>
          </RefSection>

          <RefSection title="Near me, near you, over there" note="One three-way pattern runs through pronouns, 'this/that', plurals and places. The first column sits with the speaker, the second with the listener, the third away from both. Learn one row and the others follow: swap tē- for ē- to go plural, swap the ending onto ko- for places.">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={thStyle}></th><th style={thStyle}>Near me</th><th style={thStyle}>Near you</th><th style={thStyle}>Away from us</th></tr></thead>
              <tbody>
                {[['Person','ahau / au (I)','koe (you)','ia (them)'],['One thing','tēnei (this)','tēnā (that)','tērā (that over there)'],['Many things','ēnei (these)','ēnā (those)','ērā (those over there)'],['Place','konei (here)','konā (there)','korā (over there)'],
                ].map(([k,a,b,c],i) => (
                  <tr key={i}><td style={{...(i%2===0?tdStyle:tdAltStyle),fontSize:13,color:'var(--soft)'}}>{k}</td><td style={i%2===0?tdStyle:tdAltStyle}>{a}</td><td style={i%2===0?tdStyle:tdAltStyle}>{b}</td><td style={i%2===0?tdStyle:tdAltStyle}>{c}</td></tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: 13, color: 'var(--soft)', marginTop: 8, lineHeight: 1.6 }}>Reira works alongside these for &quot;there, the place we just mentioned&quot;: waiho ki reira (leave it there). In use: homai tēnā (give me that, by you), mauria atu ki korā (take it over there).</div>
          </RefSection>

          <RefSection title="Question words" note="Questions are formed by putting these at the start of a sentence. He aha = what, Ko wai = who (using ko for identity).">
            <RefTable rows={[['aha','what'],['wai','who'],['hea','where'],['āhea','when (future)'],['nōnahea','when (past)'],['pēhea','how / what like'],['hia','how many'],['tēhea','which'],['he aha ai','why'],['nā wai','whose / by whom']]} />
          </RefSection>

          <RefSection title="Verbs" note="Verbs don't change form in te reo: tense is carried by the particle before them (kei te, i, ka). The verb always comes first in a sentence.">
            <RefTable rows={[['kai','eat (also: food)'],['moe','sleep'],['haere','go / travel'],['hoki','return / also'],['noho','sit / stay / live'],['kōrero','speak / talk'],['whakarongo','listen'],['titiro','look'],['mahi','work / do'],['ako','learn / teach'],['aroha','love / care'],['tū','stand'],['oma','run'],['huri','turn'],['homai','give (to me)'],['mōhio','know / understand'],['tuhi','write'],['pānui','read / announce'],['inu','drink'],['tangi','cry / mourn'],['kata','laugh'],['oho','wake up / startle'],['pātai','ask / question'],['whakautu','answer / reply'],['tiki','fetch / go and get'],['hopu','catch / capture'],['tunu','cook / roast'],['horoi','wash'],['hoko','buy / sell'],['whakaaro','think']]} />
          </RefSection>

          <RefSection title="More verbs" note="A second batch to round out the everyday verb set, from watching and playing to caring for someone and getting ready.">
            <RefTable rows={[['mātakitaki','watch'],['tākaro','play'],['wānanga','study / discuss (in a learning forum)'],['tirotiro','look around / examine'],['whakamahi','use'],['tango','take / remove'],['whiwhi','receive / obtain'],['tautoko','support'],['āwhina','help'],['whakatau','settle / decide / welcome formally'],['karanga','call out (a ceremonial call)'],['whakapono','believe'],['mahara','remember / think of'],['wareware','forget'],['maumahara','recall / remember'],['tiaki','look after / care for'],['whāngai','feed / raise'],['kuhu','enter'],['puta','come out / appear / exit'],['tahuri','attend to / turn to'],['whakamātau','try / test'],['rapu','search for'],['kimi','look for / seek'],['whakaatu','show / display'],['whakamārama','explain'],['tīmata','begin / start'],['whakaoti','finish / complete (something)'],['whakatipu','grow / grow up'],['kaukau','swim'],['kanikani','dance'],['waiata','sing'],['tono','ask (request something)'],['whakawhiti','exchange / swap'],['kukume','pull / drag'],['pana','push / push away'],['waha','carry (on the back) / broadcast'],['piki','climb'],['rere','fly'],['hinga','fall'],['pakaru','break'],['tuku','release / send / allow'],['tāpiri','add / append'],['whakatika','fix / correct / straighten'],['tatari','wait'],['tūtaki','meet'],['whakarite','prepare / arrange'],['whakapai','fix up / improve / bless'],['whakanui','celebrate / honour / make much of'],['whakatakoto','lay out / set down'],['whakahoki','return / give back'],['waea atu','phone / call (someone)'],['rongo','hear / sense'],['tūmanako','hope / anticipate'],['whakapā','contact / get in touch']]} />
          </RefSection>

          <RefSection title="Nouns" note="Some words carry layered meanings: marama means moon, month, and understanding. Whenua means both land and placenta. These double meanings are culturally significant, not coincidental.">
            <RefTable rows={[['whare','house / building'],['kāinga','home / village'],['wāhi','place'],['whenua','land / placenta'],['moana','sea / ocean'],['awa','river'],['maunga','mountain'],['ngahere','forest'],['rangi','sky / day'],['rā','sun / day / sail'],['marama','moon / month / understanding'],['wai','water'],['ahi','fire'],['tangata','person'],['tāne','man'],['wahine','woman'],['tamariki','children'],['tamaiti','child'],['whānau','family'],['iwi','tribe / people / bones'],['hapū','subtribe / pregnant'],['ingoa','name'],['reo','language / voice'],['waka','canoe / vehicle'],['pō','night'],['atarau','moonlit / reflected moonlight'],['katoa','all / everyone / everything'],['kurī','dog'],['ngeru','cat'],['poaka','pig'],['hipi','sheep'],['kau','cow'],['hōiho','horse'],['heihei','chicken / hen'],['manu','bird'],['ika','fish'],['tūī','tūī (native songbird)'],['kea','kea (alpine parrot)'],['kererū','kererū (native wood pigeon)'],['rāpeti','rabbit'],['pūngāwerewere','spider'],['kiore','rat / mouse'],['kūmara','sweet potato'],['rīwai','potato'],['āporo','apple'],['parāoa','bread'],['miraka','milk'],['huka','sugar'],['kawhe','coffee'],['tī','tea (the drink)'],['mīti','meat'],['hēki','egg'],['tote','salt'],['hua rākau','fruit'],['huawhenua','vegetable'],['pāpā','father / dad'],['whaea','mother / mum'],['tuakana','older sibling (same gender)'],['teina','younger sibling (same gender)'],['tuahine','sister (of a male)'],['tungāne','brother (of a female)'],['koroua','elderly man / grandfather'],['kuia','elderly woman / grandmother'],['mokopuna','grandchild'],['hoa','friend'],['tama','son / boy'],['tamāhine','daughter / girl'],['ua','rain'],['hau','wind'],['kapua','cloud'],['marangai','storm / east wind'],['pukapuka','book'],['tūru','chair'],['tēpu','table'],['whāriki','mat / carpet'],['waea','telephone'],['waea pūkoro','mobile phone'],['rorohiko','computer'],['kura','school'],['hōhipera','hospital'],['moni','money'],['wiki','week'],['hāora','hour'],['meneti','minute']]} />
          </RefSection>

          <RefSection title="More nouns, people, ideas & culture" note="Words for the everyday concepts and roles that come up across marae life, community, and conversation.">
            <RefTable rows={[['whakaaro','thought / idea'],['kupu','word'],['kaupapa','topic / purpose / agenda'],['taonga','treasure'],['mātua','parents'],['rangatira','chief / leader'],['kaumātua','elder (male)'],['tohunga','expert / priest / specialist'],['atua','god / deity / supernatural being'],['wairua','spirit'],['mana','prestige / authority / standing'],['marae','meeting grounds'],['hui','gathering / meeting'],['waiata','song'],['haka','posture dance / war dance'],['whakapapa','genealogy'],['rohe','region / boundary'],['kaitiaki','guardian / caretaker'],['koha','gift / donation'],['hākari','feast'],['kaimahi','employee / worker'],['pēpi','baby'],['hoariri','enemy'],['taumata','summit / peak / standard'],['tūranga','position / status'],['kitenga','discovery / finding'],['hokinga','return / homecoming'],['take','reason / topic / issue'],['raruraru','problem / trouble'],['wā','time / period'],['whakaaturanga','exhibition / display'],['whakaahua','photo / image'],['pikitia','picture / photo / movie'],['tauira','example'],['oranga','well-being / livelihood'],['hauora','holistic health / wellbeing'],['mamae','pain'],['hā','breath'],['harikoa','happiness / joy'],['pouaka','box'],['pouaka whakaata','television'],['reo irirangi','radio'],['reta','letter (mail)'],['wharepaku','toilet'],['haerenga','journey / trip'],['tohu','sign / mark / symbol'],['wehi','fear / awe'],['ture','law']]} />
          </RefSection>

          <RefSection title="More nouns, clothing, places & nature" note="Around the house, out on the land, and getting from place to place.">
            <RefTable rows={[['kākahu','clothing'],['pōtae','hat'],['hū','shoes'],['tarau','trousers'],['koti','coat / jacket'],['paraikete','blanket'],['huarahi','road / path'],['tāone','town / city'],['kōhatu','stone / rock'],['roto','lake'],['puke','hill'],['one','beach / sand'],['motu','island'],['tai','tide / coast'],['ngaru','wave'],['ngutu','lip'],['niho','teeth'],['makawe','hair (of the head)'],['karu','eye (alternative term)'],['roimata','tears'],['kaipuke','ship'],['taraka','truck'],['motokā','car'],['tereina','train'],['waka rererangi','aeroplane'],['kiwi','kiwi (bird)'],['toroa','albatross'],['matau','right (direction)'],['mauī','left (direction)'],['whakawhitinga','crossing (a river or road)'],['karere','message / messenger']]} />
          </RefSection>

          <RefSection title="More nouns, home, seasons & extras" note="Household objects, the birds and treasures around them, and the four seasons.">
            <RefTable rows={[['pī','chick / baby bird'],['poi','poi (item used in poi dance)'],['pounamu','greenstone / jade'],['hinu','oil / fat'],['ate','liver / seat of emotion'],['puku','stomach / belly'],['uma','chest'],['kapu','cup'],['pereti','plate'],['kāpata','cupboard'],['moenga','bed'],['pepa','paper'],['whārangi','page'],['kete','basket / kit'],['mahere','map / plan'],['karani','grandmother (informal)'],['rama','lamp / light'],['huia','huia (extinct native bird, culturally treasured)'],['ngahuru','autumn'],['raumati','summer'],['hōtoke','winter'],['kōanga','spring'],['pakihi','business'],['pūtea','fund / money pool'],['rawa','resources / property'],['hōtēra','hotel'],['toa','warrior / brave person']]} />
          </RefSection>

          <RefSection title="Body parts" note="Manawa (breath/heart/lungs) is a rich word: it carries the sense of vitality and life force. Kanohi technically means face but is also used for eye. Ringa covers both hand and arm.">
            <RefTable rows={[['tinana','body'],['upoko','head'],['kanohi','face / eye'],['taringa','ear'],['ihu','nose'],['waha','mouth'],['ringa','hand / arm'],['waewae','foot / leg'],['manawa','breath / heart / lungs'],['ngākau','heart / innermost feelings'],['kōpū','abdomen / womb'],['kiri','skin'],['iwi','bone, also means tribe/people (a real double meaning)'],['toto','blood'],['kakī','neck / throat'],['pokohiwi','shoulder'],['matimati','finger / toe'],['turi','knee']]} />
          </RefSection>

          <RefSection title="Descriptors" note="Descriptors follow the noun they describe: he tangata pai ia (he is a good person). Pai is probably the most useful single word in the language.">
            <RefTable rows={[['pai','good'],['kino','bad'],['nui','big / many'],['iti','small'],['roa','long / tall'],['poto','short'],['hou','new'],['tawhito','old'],['ātaahua','beautiful'],['kaha','strong'],['ngenge','tired'],['hiakai','hungry'],['hiainu','thirsty'],['hari','happy'],['pōuri','sad'],['tika','correct / right'],['hē','wrong'],['whakatoi','cheeky / playfully mischievous'],['rawe','awesome / excellent / fantastic'],['pōkarekare','rippling / agitated (as water)'],['wera','hot'],['makariri','cold'],['mākūkū','wet / damp'],['maroke','dry'],['riri','angry'],['whakamā','shy / embarrassed'],['ora','alive / well / healthy'],['ngāwari','easy / gentle / soft'],['uaua','difficult / hard'],['hōhā','annoyed / fed up'],['pukuriri','very angry'],['māharahara','worried'],['koa','joyful'],['mataku','afraid'],['teitei','tall / high'],['rerekē','different'],['tapu','sacred / restricted'],['noa','free of restriction / ordinary'],['wātea','free / available'],['kahurangi','precious / treasured'],['waimarie','lucky / fortunate'],['rongonui','famous / well-known'],['ngaro','lost'],['tūpato','careful / cautious'],['maha','many / numerous'],['nunui','plentiful / big (plural)'],['tuwhera','open'],['kī','full'],['ngū','silent / mute'],['haruru','loud / rumbling (of thunder, engines)'],['mā (clean)','clean'],['pakeke','adult / grown-up'],['rahi','big / great'],['tere','fast / quick'],['pūhoi','slow'],['māmā','light / easy, also means "mum" (a real double meaning)'],['haumaru','safe'],['angitu','successful'],['ngoikore','weak / feeble'],['pakari','strong / firm / mature'],['tata','near / close'],['tawhiti','far / distant']]} />
          </RefSection>

          <RefSection title="Numbers" note="Beyond 10 the system is logical: tekau mā tahi = 11, rua tekau = 20. Kore (zero) also means void and nothingness. It appears in the Māori creation narrative as the primordial state before existence. Ordinals swap the tua- prefix onto the cardinal number.">
            <RefTable rows={[['kore','zero / void / nothingness'],['tahi','one'],['rua','two'],['toru','three'],['whā','four'],['rima','five'],['ono','six'],['whitu','seven'],['waru','eight'],['iwa','nine'],['tekau','ten'],['tekau mā tahi','eleven'],['tekau mā rua','twelve'],['tekau mā toru','thirteen'],['tekau mā whā','fourteen'],['tekau mā rima','fifteen'],['tekau mā ono','sixteen'],['tekau mā whitu','seventeen'],['tekau mā waru','eighteen'],['tekau mā iwa','nineteen'],['rua tekau','twenty'],['toru tekau','thirty'],['whā tekau','forty'],['rima tekau','fifty'],['ono tekau','sixty'],['whitu tekau','seventy'],['waru tekau','eighty'],['iwa tekau','ninety'],['kotahi rau','one hundred'],['rua rau','two hundred'],['toru rau','three hundred'],['kotahi mano','one thousand'],['tuatahi','first'],['tuarua','second'],['tuatoru','third'],['tuawhā','fourth'],['tuarima','fifth'],['tokorua','a pair / couple'],['tini','many / countless']]} />
          </RefSection>

          <RefSection title="Time" note="Te reo expresses time through context and particles rather than verb tenses. These words combine with kei te / i / ka to anchor when something happens.">
            <RefTable rows={[['ata','morning / dawn'],['ao','daytime / world / dawn'],['ahiahi','afternoon / evening'],['pō','night'],['ināianei','now'],['āpōpō','tomorrow'],['inanahi','yesterday'],['i tēnei rā','today']]} />
          </RefSection>

          <RefSection title="Time phrases" note="Two small switches build most of these. i points back or to now (i tērā wiki, last week), ā points forward (ā tērā wiki, next week). tēnei means this one, tērā means that one, so i tēnei wiki = this week, i tērā wiki = last week, ā tērā wiki = next week.">
            <RefTable rows={[['i tēnei rā / tēnei rangi','today'],['i tēnei ata','this morning'],['i tēnei ahiahi','this afternoon'],['i tēnei pō','tonight'],['i tēnei wiki','this week'],['i tērā wiki','last week'],['i tērā marama','last month'],['i tērā tau','last year'],['ā tērā wiki','next week'],['ā tērā marama','next month'],['ā tērā tau','next year'],['ināianei tonu','right now'],['mō āke tonu','forever'],['i ngā wā katoa','all the time'],['ia rā ia rā','every day']]} />
          </RefSection>

          <RefSection title="Directional particles" note="These four particles attach to verbs to show direction relative to the speaker. Haere mai = come towards me, haere atu = go away. Whakarongo mai means listen here!">
            <RefTable rows={[['mai','towards the speaker'],['atu','away from the speaker'],['ake','upward'],['iho','downward']]} />
          </RefSection>

          <RefSection title="Core particles" note="Te reo is VSO (verb-subject-object): the particle always opens the sentence and signals what kind of sentence it is.">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={thStyle}>Particle</th><th style={thStyle}>Function</th></tr></thead>
              <tbody>
                {[['kei te','present action: kei te kai au (I am eating)'],['i','past action: i haere au (I went)'],['ka','narrative / sequence: ka haere ia (she went)'],['e...ana','emphatic present: e kai ana au (I am eating right now)'],['me','should: me haere tāua (we should go)'],['ko','identity: ko Mere tōku ingoa (my name is Mere)'],['he','a / an: he tangata pai ia (he is a good person)'],['kei','present location: kei te kāinga au (I am at home)'],['te','the (singular)'],['ngā','the (plural)'],['ki','to / towards'],['nō','from / origin'],['nā','by / belonging to (recent)'],['kāore','no / not'],['ehara','is not'],
                ].map(([tr,fn],i) => (
                  <tr key={i}><td style={{...(i%2===0?tdStyle:tdAltStyle),fontWeight:'bold',width:'35%'}}>{tr}</td><td style={i%2===0?tdStyle:tdAltStyle}>{fn}</td></tr>
                ))}
              </tbody>
            </table>
          </RefSection>

          <RefSection title="More particles" note="Smaller grammar words that show up constantly once you're past the basics: linking words, demonstratives, and a few that just don't translate to a single English word.">
            <RefTable rows={[['kua','perfective / already marker'],['nei','this / right here (emphatic)'],['ai','linking particle (so that / and then)'],['mō','for / because of'],['rānei','or'],['ahakoa','although / even though'],['anake','only / just'],['mā (by/for)','by / for (future)'],['roto (in/at)','in / at / within'],['tētahi','a certain / one (indefinite)'],['arā','namely / that is'],['taua','the aforementioned'],['mea','a thing / matter'],['hei','for / at (future time or purpose)'],['konei','here (this spot)'],['tēnā','that (near you)'],['ērā','those (aforementioned)'],['pēnei','like this / in this way'],['pērā','like that'],['i muri','after / behind'],['i mua','before / in front'],['koa (please)','please (softens a request)'],['kaua e',"don't (prohibition)"],['nā te mea','because'],['rite ki','like / similar to']]} />
          </RefSection>

          <RefSection title="Possessives" note="Ō class = things you inhabit or are subordinate to (family, body, feelings, home). Ā class = things you control or act upon (objects you make, food you eat). Tō- for people/places, tā- for things you do. The same dual/plural pattern as the pronouns (māua, tāua, mātou, tātou) attaches for 'our'.">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={thStyle}>Te Reo</th><th style={thStyle}>English</th><th style={thStyle}>Class</th></tr></thead>
              <tbody>
                {[['tōku','my','ō: people, places, feelings'],['tōu','your (one person)','ō'],['tāku','my','ā: actions, objects'],['tāu','your (one person)','ā'],
                  ['tō māua','our (two, not you)','ō'],['tō tāua','our (two, including you)','ō'],['tō mātou','our (three+, not you)','ō'],['tō tātou','our (all)','ō'],
                  ['tā māua','our (two, not you)','ā'],['tā tāua','our (two, including you)','ā'],['tā mātou','our (three+, not you)','ā'],['tā tātou','our (all)','ā'],
                ].map(([tr,en,cls],i) => (
                  <tr key={i}><td style={i%2===0?tdStyle:tdAltStyle}>{tr}</td><td style={i%2===0?tdStyle:tdAltStyle}>{en}</td><td style={{...(i%2===0?tdStyle:tdAltStyle),fontSize:13,color:'var(--soft)'}}>{cls}</td></tr>
                ))}
              </tbody>
            </table>
          </RefSection>

          <RefSection title="Shapes">
            <RefTable rows={[['tapatoru','triangle'],['tapawhā','square / rectangle'],['porohīta','circle'],['whetū','star'],['porotītaha','oval / ellipse']]} />
          </RefSection>

          <RefSection title="Colours" note="Colours in te reo often have natural world origins: kākāriki is both green and a native parakeet, kōwhai is both yellow and the native flowering tree.">
            <RefTable rows={[['whero','red'],['kōwhai','yellow'],['kākāriki','green'],['kikorangi','blue'],['mā','white'],['mangu / pango','black'],['karaka','orange'],['kākaka','brown'],['māwhero','pink'],['pāpura','purple'],['kiwikiwi','grey'],['kōura','gold'],['hiriwa','silver']]} />
          </RefSection>

          <RefSection title="Days of the week & months" note="The days of the week are built on Rā (day/sun) plus a number or borrowed name. The twelve traditional Māori month names track the maramataka (lunar calendar) rather than the Gregorian calendar exactly, but map roughly onto the months below.">
            <RefTable rows={[['Rāhina','Monday'],['Rātū','Tuesday'],['Rāapa','Wednesday'],['Rāpare','Thursday'],['Rāmere','Friday'],['Rāhoroi','Saturday'],['Rātapu','Sunday'],['Kohitātea','January'],['Huitanguru','February'],['Poutūterangi','March'],['Paengawhāwhā','April'],['Haratua','May'],['Pipiri','June'],['Hōngongoi','July'],['Here-turi-kōkā','August'],['Mahuru','September'],['Whiringa-ā-nuku','October'],['Whiringa-ā-rangi','November'],['Hakihea','December']]} />
          </RefSection>

          <RefSection title="Tikanga & marae" note="Core vocabulary for the customs, protocols and physical spaces of a marae, the words in this deck are also concepts, not just labels, so a plain translation only tells part of the story.">
            <RefTable rows={[['pōwhiri','ceremonial welcome onto a marae'],['mihi whakatau','a formal welcome speech'],['karakia','prayer / incantation / blessing'],['mauri','life force / vital essence'],['manaakitanga','hospitality / care for others'],['kotahitanga','unity / solidarity'],['whanaungatanga','the process of relationship-building'],['wharenui','meeting house'],['wharekai','dining hall'],['paepae',"the speakers' bench at the front of a meeting house"],['kaikōrero','orator / speaker'],['manuhiri','group of visitors'],['tangata whenua','host people / local people'],['ahurea','culture'],['tuku iho','custom handed down through generations'],['whakaute','respect'],['mahi tahi','working together / cooperation'],['tangihanga','the rites and rituals of mourning for the dead'],['whaikōrero','formal speech / oratory'],['waiata tangi','lament / traditional song of mourning'],['waiata-ā-ringa','action song'],['patu','a traditional short club-like weapon'],['tekoteko','carved ancestral figure'],['whakairo','carving'],['kākahu (as cloak)','a traditional woven cloak'],['tā moko','traditional facial or body tattoo'],['kōhanga reo','language nest / early-childhood language immersion'],['kura kaupapa Māori','Māori-medium immersion primary school'],['kaitiakitanga','guardianship / stewardship of the environment'],['te ao Māori','the Māori worldview'],['rangatiratanga','chieftainship / sovereignty'],['tino rangatiratanga','self-determination (a key Te Tiriti o Waitangi concept)'],['utu','reciprocity / cost / balance owed (a core tikanga concept)'],['ihi','psychic force / power / vitality']]} />
          </RefSection>

          <RefSection title="Sentence templates" note="The core pattern: [particle] + [verb] + [subject] + [location/object]. Kei te is your most useful particle. Put it before almost any verb for a present tense sentence.">
            <RefTable rows={[['kei te kai au','I am eating'],['kei te pai','it\'s good / that\'s fine'],['kei te ngenge au','I\'m tired'],['kei te hiakai au','I\'m hungry'],['i haere au','I went'],['ka haere ia','she / he went'],['me haere tāua','we two should go'],['ko ___ tōku ingoa','my name is ___'],['ko wai tōu ingoa?','what is your name?'],['nō hea koe?','where are you from?'],['he aha tāu mahi?','what are you doing?'],['kāore au e mōhio ana','I don\'t know'],['whakarongo mai!','listen here!'],['kia kaha','be strong / keep going'],['ka kite anō','see you again'],['ka nui te hari o tōku ngākau','my heart is very happy'],['kei te aha koe?',"what's up? / how's it going?"],['kei te haere koe ki hea?','where are you going?'],['kei te haere au ki te kāinga','I am going home'],['e hia te wā?','what time is it?'],['ka taea e koe te āwhina i a au?','can you help me?'],['ki tōku whakaaro','in my opinion'],['he aha tō whakaaro?','what do you think?'],['e hia te utu o tēnei?','how much is this?'],['e hiahia ana au ki te ___, koa','I would like ___, please'],['ngā mihi mō tō āwhina','thank you for your help'],['kāore he raru','no problem at all'],['ka taea e au te noho ki konei?','can I sit here?'],['kia tūpato','take care'],['nau mai ki tō mātou kāinga','welcome to our home'],["e whakaae ana au",'I agree'],['kāore au e whakaae ana','I disagree']]} />
          </RefSection>

          <RefSection title="He tono, commands" note="Commands lean on the directional particles: mai pulls towards the speaker, atu pushes away. Homai (give to me) and hoatu (give to someone else) carry the direction inside the word. Short verbs (two long vowels or fewer) usually take e in front: e noho, e oho, e tū. Kaua e + verb says don't.">
            <RefTable rows={[['uru mai','come inside'],['haere atu','go away / off you go'],['puta atu','go out'],['e noho ki konei','sit here'],['homai ngā mea rā','give me those things over there'],['hoatu','give (to someone else)'],['hoatu ēnei ki a Mere','give these to Mere'],['mauria mai','bring it'],['mauria mai ki konei','bring it here'],['mauria atu','take it away'],['mauria atu ki korā','take it over there'],['waiho','leave it alone'],['waiho ki reira','leave it there'],['whakatata mai','come closer'],['whakatata atu','go closer'],['kia tere te haere','go quickly'],['kia tere mai, tamariki mā','hurry up, children'],['turituri','be quiet'],['kaua e tangi',"don't cry"],['e oho','wake up']]} />
          </RefSection>

          <RefSection title="Koe, kōrua, koutou" note="Same sentence, three audiences: swap only the pronoun for one, two, or three-plus people. Te āhua nei (it looks like) softens a statement into an observation.">
            <RefTable rows={[['kei te pai koe / kōrua / koutou?','are you (one / two / all) okay?'],['kei te haere koe / kōrua / koutou ki hea?','where are you (one / two / all) going?'],['te āhua nei, kei te raru koe','looks like you are in trouble'],['te āhua nei, kei te ngaro kōrua','looks like you two are lost']]} />
          </RefSection>

          <RefSection title="Praise & exclamations" note="Everyday reactions, heavy in kōrero with kids and mates. Hoki here adds emphasis (really, so), not its 'return' meaning. Several (wananei, tumeke, e mara, keke ana) sit at the slangy end and vary by region and generation.">
            <RefTable rows={[['tau kē!','awesome!'],['wananei!','wicked!'],['tumeke!','awesome! / too much!'],['e mara!','hey bro!'],['titiro!','look!'],['kia tau!','relax / settle'],['keke ana te haere','off like a rocket'],['he reka!','yum!'],['me haere',"let's go"],['te ātaahua hoki!',"that's beautiful!"],['he tino pai hoki koe!',"you're very good!"],['ka mau te wehi!',"that's amazing!"],['kātahi nā te tamaiti mōhio, ko koe!','what a clever child you are!'],['kei runga noa atu koe!',"you're the best!"],['auē, e hika mā!','goodness me!'],['pai kare!','by golly!'],['kaua e mahi pēnā!',"don't do that!"]]} />
          </RefSection>

          <RefSection title="Kīwaha of Hauraki" note="Colloquial sayings recorded for the Hauraki region. Kīwaha carry attitude more than literal meaning, so learn them as whole chunks. Note the possessive: nōku / nōu / nōna te hē = my / your / their fault.">
            <RefTable rows={[['kāti anō hoki','a know-all / show-off'],['whakamanamana i a au','praising myself'],['he aha hoki?','so what? / whatever!'],['he aha hoki te hē?',"so what's the problem?"],['e kare hoki','simmer down'],['kai toa!','serves you right!'],['nōku / nōu / nōna te hē','my / your / their fault'],['wahanui','big mouth'],['kei kōwhai tonu te hamuti','young and inexperienced'],['ka wahangūtia','silenced'],['harihari kōrero','gossip'],['ngutu tawetawe','talkative'],['kaua koe e ngarengare mai ki ahau',"don't boss me around"],['kua pāngu te tangata','fed up / a nuisance'],['e kī! e kī!','is that right?'],['purahutihuti ana','ragged, tattered'],['engari mō tēnā','but as for that'],['nā wai rā i kī?','who said that?'],['kurehu taku titiro','my sight is foggy'],['kaua e kōrero pēnā',"don't talk like that"],['kia ngāwari te kōrero','keep it gentle and simple'],['mā tō reo anō kia mārama','let your voice make it clear']]} />
          </RefSection>

          <RefSection title="How to converse & build a sentence" note="Word order is the backbone of te reo: get the order right and the sentence works, even with simple vocabulary. This section walks through the pattern, then works through several full exchanges scenario by scenario. (The Converse tab turns these same exchanges into an interactive practice.)">
            <div style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
              <p style={{ marginBottom: 12 }}>
                Te reo Māori is <strong>VSO</strong>, verb (or particle + verb) first, then subject, then everything else. English speakers default to subject-first (&quot;I am eating&quot;), so the biggest habit to build is starting the sentence with the particle, not the person.
              </p>
              <p style={{ marginBottom: 12 }}>
                <strong>[particle] + [verb] + [subject] + [location / object]</strong><br/>
                <em>Kei te kai au i te āporo</em> → kei te (present) + kai (eat) + au (I) + i te āporo (the apple) = &quot;I am eating the apple.&quot;
              </p>
              <p style={{ marginBottom: 12 }}>
                Swap the particle to change when something happens, and everything after it stays in the same order: <em>i kai au</em> (I ate), <em>ka kai au</em> (I will eat / then I ate, narrative), <em>me kai au</em> (I should eat), <em>kua kai au</em> (I have eaten).
              </p>
              <p style={{ marginBottom: 0 }}>
                To ask a question, the same word order holds, question words like <em>he aha</em> (what) or <em>ko wai</em> (who) usually open the sentence, and the reply mirrors the shape of the question back.
              </p>
            </div>
            {DIALOGUES.map(d => (
              <div key={d.id} style={{ border: '1.5px solid var(--ink)', borderRadius: 12, padding: '16px 18px', marginBottom: 16 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--soft)', marginBottom: 2 }}>{d.title}</div>
                <div style={{ fontSize: 12, color: 'var(--soft)', fontStyle: 'italic', marginBottom: 10 }}>{d.scenario}</div>
                {d.lines.map((l, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '7px 0', borderBottom: i < d.lines.length - 1 ? '1px solid var(--hair)' : 'none' }}>
                    <span style={{ fontWeight: 'bold', width: 20, flexShrink: 0 }}>{l.speaker}:</span>
                    <span style={{ flex: 1 }}>
                      <span style={{ fontWeight: 'bold' }}>{l.tr}</span>
                      <br/>
                      <span style={{ color: 'var(--soft)', fontSize: 13, fontStyle: 'italic' }}>{l.en}</span>
                    </span>
                  </div>
                ))}
              </div>
            ))}
            <RefTable rows={[
              ['he aha ai koe i haere ai?', 'why did you go?'],
              ['nā te aha koe i pōuri ai?', 'what made you sad?'],
              ['ki tāku whakaaro, he pai tēnei', 'in my view, this is good'],
              ['engari...', 'but... (to disagree politely, then explain)'],
              ['nā reira...', 'and so... / therefore...'],
              ['āe, koia rā', "yes, that's right"],
              ['kāo, ehara i te mea pēnā', "no, it's not like that"],
              ['he pātai tāku', 'I have a question'],
              ['kāore anō au kia mōhio', "I don't know yet"],
              ['waihoki...', 'also... / likewise...'],
            ]} />
          </RefSection>

          <RefSection title="Commands, reasons & comparisons" note="Three more grammar patterns that come up the moment conversation gets past the basics: telling someone what not to do, explaining why, and comparing two things.">
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
              <thead><tr><th style={thStyle}>Pattern</th><th style={thStyle}>Function</th></tr></thead>
              <tbody>
                {[
                  ['kaua e + verb', "don't ___ : kaua e mataku (don't be afraid), kaua e haere ināianei (don't go yet)"],
                  ['e + verb (bare)', 'a direct command: e noho (sit), e tū (stand up)'],
                  ['kia + verb', 'a softer instruction/wish: kia tere (hurry up), kia ngū (be quiet)'],
                  ['nā te mea / nō te mea', 'because ___ (comes after the main clause): kei te ngenge au nā te mea i mahi au (I\'m tired because I worked)'],
                  ['he aha ai...?', 'why...? (uses the -ai relative form): he aha ia i tangi ai? (why is she crying?)'],
                  ['he ___ ake', '-er / more ___: he pai ake (better), he nui ake (bigger)'],
                  ['rite ki', 'like / similar to: he rite tēnei ki tēnā (this is like that)'],
                  ['kāore i te rite', "not the same / doesn't match"],
                ].map(([tr,fn],i) => (
                  <tr key={i}><td style={{...(i%2===0?tdStyle:tdAltStyle),fontWeight:'bold',width:'35%'}}>{tr}</td><td style={i%2===0?tdStyle:tdAltStyle}>{fn}</td></tr>
                ))}
              </tbody>
            </table>
          </RefSection>

          <RefSection title="Directions & getting around" note="Matau (right) and mauī (left) don't take a possessive the way body-part words do, they're used as plain direction terms: ki matau, ki mauī.">
            <RefTable rows={[
              ['tēnā koa, kei hea te hokomaha?', 'excuse me, where is the supermarket?'],
              ['haere tika atu', 'go straight ahead'],
              ['huri ki matau', 'turn right'],
              ['huri ki mauī', 'turn left'],
              ['e tata ana', "it's near"],
              ['e tawhiti ana', "it's far"],
              ['e tawhiti ana i konei?', 'is it far from here?'],
              ['me pēhea au e tae ai ki te teihana?', 'how do I get to the station?'],
              ['ko tēnei te huarahi ki te tāone?', 'is this the road to the city?'],
              ['kua ngaro au', "I'm lost"],
              ['ka taea e koe te whakaatu mai ki ahau i runga i te mahere?', 'can you show me on the map?'],
              ['haere mā runga i te whakawhitinga', 'walk across the crossing'],
              ['tekau meneti te roa', 'it takes ten minutes'],
            ]} />
          </RefSection>

          <RefSection title="Shopping, kai & phone calls" note="Kei i a koe...? asks whether someone has something on them right now. Waea atu (call out) and waea mai (call in) mirror the atu/mai direction pattern from the particles section.">
            <RefTable rows={[
              ['e hiahia ana au ki tētahi kawhe, koa', 'I would like a coffee, please'],
              ['kei i a koe ētahi hua rākau?', 'do you have any fruit?'],
              ['e hia te utu o tēnei mea?', 'how much does this cost?'],
              ['he nui rawa te utu', "that's too expensive"],
              ['ka taea e au te utu mā te kāri?', 'can I pay with a card?'],
              ['ka taea e au te tono i te nama, koa?', 'can I have the bill, please?'],
              ['he reka tēnei kai', 'this food is delicious'],
              ['kua mākona au', 'I am full (from eating)'],
              ['ka waea atu au ki a koe āpōpō', "I'll call you tomorrow"],
              ['ko wai kei te waea mai?', "who's calling?"],
              ['waiho he karere', 'leave a message'],
              ['ka tuku au i tētahi karere kuputuhi ki a koe', "I'll send you a text"],
              ['ka taea e koe te waea mai anō ki ahau?', 'can you call me back?'],
              ['he aha tō nama waea?', 'what is your phone number?'],
            ]} />
          </RefSection>

          <RefSection title="Making plans, small talk & apologies" note="Wātea (free / available) is the word to reach for whenever someone's asking about your availability, not just objects being free.">
            <RefTable rows={[
              ['kei te wātea koe āpōpō?', 'are you free tomorrow?'],
              ['e pīrangi ana koe ki te haere mai ki taku kāinga?', 'would you like to come to my place?'],
              ['me tūtaki tāua ā tērā wiki', "let's meet next week"],
              ['ka hari au ki te haere mai', "I'd love to come"],
              ['kāore e taea e au te haere, aroha mai', "I can't make it, sorry"],
              ['kei te pēhea tō whānau?', 'how is your family?'],
              ['i pēhea tō mutunga wiki?', 'how was your weekend?'],
              ['kua roa koe e noho ana ki konei?', 'how long have you lived here?'],
              ['he aha tāu e pīrangi ana ki te mahi?', 'what do you like to do?'],
              ['aroha mai, kua tōmuri au', "I'm sorry, I'm late"],
              ['aroha mai, i wareware au', 'sorry, I forgot'],
              ['nāku te hē', "it's my fault"],
              ['aroha mai, he aha tāu i kī ai?', 'sorry, what did you say?'],
              ['kei te mārama iti au', 'I understand a little'],
            ]} />
          </RefSection>

    </>
  )
  const kids = React.Children.toArray((all as React.ReactElement).props.children) as React.ReactElement[]
  const shown = only ? kids.filter(k => only.includes(k.props?.title)) : kids
  return <div className="tr-ref">{shown}</div>
}

const thStyle: React.CSSProperties = {
  fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--soft)',
  padding: '6px 8px', borderBottom: '1.5px solid var(--ink)', textAlign: 'left', fontWeight: 'normal',
}
const tdStyle: React.CSSProperties = {
  padding: '9px 8px', borderBottom: '1px solid var(--hair)', fontSize: 15, verticalAlign: 'top',
}
const tdAltStyle: React.CSSProperties = {
  ...tdStyle, background: 'var(--panel)',
}

function RefSection({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 16, fontWeight: 'bold', borderBottom: '2px solid var(--ink)', paddingBottom: 6, marginBottom: 4 }}>{title}</div>
      {note && <div style={{ fontSize: 13, color: 'var(--soft)', fontStyle: 'italic', marginBottom: 12, lineHeight: 1.6, padding: '8px 0' }}>{note}</div>}
      {children}
    </div>
  )
}

function RefTable({ rows }: { rows: [string, string][] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr><th style={thStyle}>Te Reo</th><th style={thStyle}>English</th></tr></thead>
      <tbody>
        {rows.map(([tr, en], i) => (
          <tr key={i}>
            <td style={{ ...(i % 2 === 0 ? tdStyle : tdAltStyle), fontWeight: 'bold', width: '45%' }}>{tr}</td>
            <td style={i % 2 === 0 ? tdStyle : tdAltStyle}>{en}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function PronounSVG() {
  return (
    <svg viewBox="0 0 340 440" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 340, display: 'block', margin: '8px auto 12px', color: 'var(--ink)' }}>
      <defs><style>{`.pl{font-family:var(--font);font-size:13px;font-weight:bold;fill:var(--ink)}.ps{font-family:var(--font);font-size:10px;fill:var(--soft);font-style:italic}`}</style></defs>
      <text x="170" y="14" textAnchor="middle" className="ps">singular</text>
      <rect x="8" y="20" width="62" height="46" rx="7" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="26" cy="36" r="8" fill="#1a7a4a"/><path d="M18 50 Q26 45 34 50" stroke="#1a7a4a" strokeWidth="1.5" fill="none"/>
      <circle cx="52" cy="36" r="8" fill="#bbb"/><path d="M44 50 Q52 45 60 50" stroke="#bbb" strokeWidth="1.5" fill="none"/>
      <text x="39" y="78" textAnchor="middle" className="pl">au</text>
      <text x="39" y="89" textAnchor="middle" className="ps">I / me</text>
      <rect x="139" y="20" width="62" height="46" rx="7" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="157" cy="36" r="8" fill="#1a7a4a"/><path d="M149 50 Q157 45 165 50" stroke="#1a7a4a" strokeWidth="1.5" fill="none"/>
      <circle cx="183" cy="36" r="8" fill="#1a6aaa"/><path d="M175 50 Q183 45 191 50" stroke="#1a6aaa" strokeWidth="1.5" fill="none"/>
      <text x="170" y="78" textAnchor="middle" className="pl">koe</text>
      <text x="170" y="89" textAnchor="middle" className="ps">you (one)</text>
      <rect x="260" y="20" width="62" height="46" rx="7" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="279" cy="36" r="8" fill="#1a7a4a"/><path d="M271 50 Q279 45 287 50" stroke="#1a7a4a" strokeWidth="1.5" fill="none"/>
      <circle cx="304" cy="36" r="8" fill="#888"/><path d="M296 50 Q304 45 312 50" stroke="#888" strokeWidth="1.5" fill="none"/>
      <text x="291" y="78" textAnchor="middle" className="pl">ia</text>
      <text x="291" y="89" textAnchor="middle" className="ps">he/she/they</text>
      <text x="170" y="108" textAnchor="middle" className="ps">dual (two people)</text>
      <rect x="2" y="114" width="72" height="64" rx="7" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="22" cy="128" r="8" fill="#1a7a4a"/><path d="M14 142 Q22 137 30 142" stroke="#1a7a4a" strokeWidth="1.5" fill="none"/>
      <circle cx="52" cy="128" r="8" fill="#1a6aaa"/><path d="M44 142 Q52 137 60 142" stroke="#1a6aaa" strokeWidth="1.5" fill="none"/>
      <circle cx="37" cy="154" r="8" fill="#bbb"/><path d="M29 168 Q37 163 45 168" stroke="#bbb" strokeWidth="1.5" fill="none"/>
      <text x="38" y="190" textAnchor="middle" className="pl">tāua</text>
      <text x="38" y="201" textAnchor="middle" className="ps">we two (incl)</text>
      <rect x="94" y="130" width="72" height="46" rx="7" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="114" cy="130" r="8" fill="#1a7a4a"/><path d="M106 144 Q114 139 122 144" stroke="#1a7a4a" strokeWidth="1.5" fill="none"/>
      <circle cx="152" cy="114" r="8" fill="#1a6aaa"/><path d="M144 128 Q152 123 160 128" stroke="#1a6aaa" strokeWidth="1.5" fill="none"/>
      <circle cx="144" cy="154" r="8" fill="#888"/><path d="M136 168 Q144 163 152 168" stroke="#888" strokeWidth="1.5" fill="none"/>
      <text x="130" y="190" textAnchor="middle" className="pl">māua</text>
      <text x="130" y="201" textAnchor="middle" className="ps">we two (excl)</text>
      <circle cx="210" cy="114" r="8" fill="#1a7a4a"/><path d="M202 128 Q210 123 218 128" stroke="#1a7a4a" strokeWidth="1.5" fill="none"/>
      <rect x="196" y="124" width="72" height="46" rx="7" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="216" cy="140" r="8" fill="#1a6aaa"/><path d="M208 154 Q216 149 224 154" stroke="#1a6aaa" strokeWidth="1.5" fill="none"/>
      <circle cx="248" cy="140" r="8" fill="#1a6aaa"/><path d="M240 154 Q248 149 256 154" stroke="#1a6aaa" strokeWidth="1.5" fill="none"/>
      <text x="232" y="190" textAnchor="middle" className="pl">kōrua</text>
      <text x="232" y="201" textAnchor="middle" className="ps">you two</text>
      <circle cx="305" cy="114" r="8" fill="#1a7a4a"/><path d="M297 128 Q305 123 313 128" stroke="#1a7a4a" strokeWidth="1.5" fill="none"/>
      <rect x="286" y="124" width="52" height="46" rx="7" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="300" cy="140" r="8" fill="#888"/><path d="M292 154 Q300 149 308 154" stroke="#888" strokeWidth="1.5" fill="none"/>
      <circle cx="324" cy="140" r="8" fill="#888"/><path d="M316 154 Q324 149 332 154" stroke="#888" strokeWidth="1.5" fill="none"/>
      <text x="312" y="190" textAnchor="middle" className="pl">rāua</text>
      <text x="312" y="201" textAnchor="middle" className="ps">they two</text>
      <text x="170" y="220" textAnchor="middle" className="ps">plural (three or more)</text>
      <rect x="2" y="226" width="72" height="80" rx="7" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="22" cy="242" r="8" fill="#1a7a4a"/><path d="M14 256 Q22 251 30 256" stroke="#1a7a4a" strokeWidth="1.5" fill="none"/>
      <circle cx="52" cy="242" r="8" fill="#1a6aaa"/><path d="M44 256 Q52 251 60 256" stroke="#1a6aaa" strokeWidth="1.5" fill="none"/>
      <circle cx="22" cy="270" r="8" fill="#888"/><path d="M14 284 Q22 279 30 284" stroke="#888" strokeWidth="1.5" fill="none"/>
      <circle cx="52" cy="270" r="8" fill="#888"/><path d="M44 284 Q52 279 60 284" stroke="#888" strokeWidth="1.5" fill="none"/>
      <text x="38" y="320" textAnchor="middle" className="pl">tātou</text>
      <text x="38" y="331" textAnchor="middle" className="ps">we all (incl)</text>
      <rect x="94" y="242" width="72" height="64" rx="7" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="114" cy="242" r="8" fill="#1a7a4a"/><path d="M106 256 Q114 251 122 256" stroke="#1a7a4a" strokeWidth="1.5" fill="none"/>
      <circle cx="152" cy="226" r="8" fill="#1a6aaa"/><path d="M144 240 Q152 235 160 240" stroke="#1a6aaa" strokeWidth="1.5" fill="none"/>
      <circle cx="114" cy="270" r="8" fill="#888"/><path d="M106 284 Q114 279 122 284" stroke="#888" strokeWidth="1.5" fill="none"/>
      <circle cx="144" cy="270" r="8" fill="#888"/><path d="M136 284 Q144 279 152 284" stroke="#888" strokeWidth="1.5" fill="none"/>
      <text x="130" y="320" textAnchor="middle" className="pl">mātou</text>
      <text x="130" y="331" textAnchor="middle" className="ps">we (excl)</text>
      <circle cx="210" cy="226" r="8" fill="#1a7a4a"/><path d="M202 240 Q210 235 218 240" stroke="#1a7a4a" strokeWidth="1.5" fill="none"/>
      <rect x="196" y="236" width="72" height="70" rx="7" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="216" cy="252" r="8" fill="#1a6aaa"/><path d="M208 266 Q216 261 224 266" stroke="#1a6aaa" strokeWidth="1.5" fill="none"/>
      <circle cx="248" cy="252" r="8" fill="#1a6aaa"/><path d="M240 266 Q248 261 256 266" stroke="#1a6aaa" strokeWidth="1.5" fill="none"/>
      <circle cx="232" cy="278" r="8" fill="#1a6aaa"/><path d="M224 292 Q232 287 240 292" stroke="#1a6aaa" strokeWidth="1.5" fill="none"/>
      <text x="232" y="320" textAnchor="middle" className="pl">koutou</text>
      <text x="232" y="331" textAnchor="middle" className="ps">you all</text>
      <circle cx="305" cy="226" r="8" fill="#1a7a4a"/><path d="M297 240 Q305 235 313 240" stroke="#1a7a4a" strokeWidth="1.5" fill="none"/>
      <rect x="284" y="236" width="54" height="70" rx="7" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="298" cy="252" r="8" fill="#888"/><path d="M290 266 Q298 261 306 266" stroke="#888" strokeWidth="1.5" fill="none"/>
      <circle cx="326" cy="252" r="8" fill="#888"/><path d="M318 266 Q326 261 334 266" stroke="#888" strokeWidth="1.5" fill="none"/>
      <circle cx="312" cy="278" r="8" fill="#888"/><path d="M304 292 Q312 287 320 292" stroke="#888" strokeWidth="1.5" fill="none"/>
      <text x="311" y="320" textAnchor="middle" className="pl">rātou</text>
      <text x="311" y="331" textAnchor="middle" className="ps">they (3+)</text>
      <rect x="4" y="348" width="332" height="38" rx="6" fill="none"/>
      <circle cx="22" cy="367" r="6" fill="#1a7a4a"/><text x="32" y="371" className="ps">speaker</text>
      <circle cx="90" cy="367" r="6" fill="#1a6aaa"/><text x="100" y="371" className="ps">listener</text>
      <circle cx="160" cy="367" r="6" fill="#888"/><text x="170" y="371" className="ps">other(s)</text>
      <rect x="228" y="360" width="18" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="2"/>
      <text x="250" y="371" className="ps">= included</text>
      <text x="170" y="410" textAnchor="middle" className="ps">incl = listener included · excl = listener excluded</text>
    </svg>
  )
}
