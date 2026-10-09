const dreams = [
['Animals','Instinct & connection','An animal might bring to mind a quality you associate with it, such as loyalty, caution or independence. Its behaviour and your feelings offer useful clues.','What qualities did this animal represent to you?','pets dog cat'],
['Baby','Beginnings & care','A baby can be a way to reflect on something new or vulnerable in your life: an idea, a responsibility or a part of yourself that needs care.','What in your life needs patience and nurturing?','child infant'],
['Being chased','Pressure & avoidance','A chase can be explored as an image of pressure or something you would rather not face. Notice who or what was chasing you and whether you felt afraid or excited.','Is there something you have been putting off?','running escape pursuit'],
['Birds','Freedom & perspective','Birds may invite thoughts about independence, distance or a wish to see things from a wider perspective. A caged bird may feel very different from one in flight.','Where would you like more room to move?','bird wings'],
['Bridge','Transition & connection','A bridge offers an image of moving between places, relationships or stages of life. Crossing easily or hesitating may change your personal reading.','What transition are you considering?','crossing'],
['Car','Direction & control','Driving may offer a way to think about your direction in life. Being a passenger, getting lost or struggling to steer can suggest different questions about control.','Who was choosing the direction in your dream?','driving vehicle road'],
['Death','Endings & change','A dream involving death can be upsetting. As a reflection prompt, it may bring up change, loss or an ending; it does not predict that someone will die.','What ending or change has been on your mind?','dying funeral'],
['Door','Possibility & boundaries','A door can suggest access, privacy or a choice. Whether it was open, locked or unfamiliar may help you connect the image with your own situation.','What would you like to welcome in or keep out?','locked doorway'],
['Exams','Expectations & readiness','An exam can be a familiar image for feeling tested or evaluated. Being unprepared may echo the experience of facing expectations, even long after leaving school.','Where do you feel you need to prove yourself?','test school studying'],
['Falling','Uncertainty & release','Falling offers a way to explore uncertainty or a lack of control. Fearful falling and a peaceful sense of letting go may hold very different meanings for you.','What feels uncertain, or difficult to hold on to?','fall drop'],
['Fire','Intensity & transformation','Fire might evoke passion, anger, energy or destruction. A comforting hearth and an uncontrolled blaze create very different emotional settings.','Did the fire feel comforting, energising or threatening?','burning flames'],
['Flying','Freedom & ambition','Flying may bring up freedom, confidence or a wish to escape limitations. Notice whether the flight felt effortless, difficult or frightening.','Where do you feel free, or wish you could feel freer?','flight float floating'],
['Forest','Exploration & the unknown','A forest may be a setting for discovery, uncertainty or refuge. Your own associations with nature matter more than a single symbolic definition.','Did being away from the familiar feel peaceful or unsettling?','woods trees'],
['House','Self & belonging','A house can be explored as an image of your inner life, memories or sense of security. Familiar rooms and unexpected spaces may bring different associations.','Which room stood out, and what did it remind you of?','home rooms building'],
['Journey','Progress & direction','A journey can invite reflection on where you are going and how you feel about getting there. Delays, companions and the destination can all be meaningful to you.','Was reaching the destination or the experience more important?','travel trip train'],
['Keys','Access & solutions','Keys can suggest a way in, a solution or a new responsibility. Losing a key might instead bring attention to feeling shut out or unsure how to proceed.','What are you trying to understand or gain access to?','key unlock'],
['Lost','Direction & belonging','Being lost can offer an image for uncertainty, unfamiliar surroundings or a search for belonging. It may also feel like an open-ended adventure.','Where would a little more guidance help you?','maze missing directions'],
['Moon','Rhythm & reflection','The moon might evoke cycles, quietness, mystery or change. Your memories and cultural associations can shape what it means in your dream.','What feels as though it is changing gradually?','night lunar'],
['Naked in public','Exposure & authenticity','Being naked in public may bring up vulnerability, embarrassment or the freedom of being unguarded. How other people reacted can change the feeling of the dream.','Where do you feel exposed or able to be fully yourself?','nude undressed clothes'],
['Ocean','Depth & emotion','An ocean may serve as an image for vast feelings, possibility or the unknown. A calm shore and rough open water can invite very different reflections.','Were you observing the water or immersed in it?','sea waves beach'],
['Pregnancy','Growth & anticipation','Pregnancy in a dream can be a prompt to consider a developing idea, change or responsibility. The dream itself is not evidence of an actual pregnancy.','What is taking shape in your life?','pregnant expecting'],
['Rain','Release & renewal','Rain may evoke relief, sadness, cleansing or a fresh start. Notice whether you welcomed it, sheltered from it or felt trapped by it.','What did the rain change about the mood of the dream?','storm weather'],
['Snake','Caution & renewal','A snake can carry many personal and cultural associations, including fear, change or renewal. Your reaction to it matters more than any universal interpretation.','What do snakes make you think of when you are awake?','snakes serpent'],
['Spiders','Patience & entanglement','A spider or web might invite thoughts about careful work, feeling caught or a personal fear. It may also simply reflect a recent encounter.','Did the web feel like a creation or a trap?','spider web'],
['Teeth falling out','Vulnerability & change','Losing teeth can be explored through concerns about appearance, communication or change. It has no single established symbolic meaning.','Were you more concerned about how you looked or what you could do?','tooth teeth losing'],
['Underground','Hidden things & exploration','Being underground may suggest privacy, retreat or exploring something unfamiliar. A shelter, tunnel and dark cave each have different associations.','Were you hiding, resting or searching for something?','cave tunnel'],
['Voice','Expression & being heard','Losing your voice might be a prompt to consider expression or feeling unheard. A powerful voice could invite reflection on confidence or influence.','What did you want to say in the dream?','speaking shouting silent'],
['Water','Emotion & movement','Water can be a useful image for exploring feelings and change. Its depth, clarity and movement, along with your reaction, can guide your own interpretation.','Was the water calm, overwhelming or refreshing?','river flood lake swimming'],
['Wedding','Commitment & union','A wedding may bring to mind partnership, expectations or a commitment to a new direction. It need not be about a literal marriage.','What commitment feels important to you right now?','marriage bride groom'],
['X-ray','Clarity & what is hidden','An X-ray may invite reflection on wanting to see beneath the surface or understand something more clearly. Consider what you hoped it would reveal.','What would you like to understand more deeply?','xray'],
['Yesterday','Memory & unfinished feelings','Revisiting an earlier time may bring up nostalgia, old relationships or unfinished thoughts. Notice what was different from your waking memory.','What from the past still feels relevant today?','past childhood memories'],
['Zoo','Boundaries & observation','A zoo may evoke curiosity, protection or restriction, depending on how you felt about the animals and their surroundings.','Who seemed free, and who seemed confined?','cage captivity']
];
const search=document.querySelector('#search'), results=document.querySelector('#results'), alphabet=document.querySelector('#alphabet');
const favouriteButton=document.querySelector('#favourites'), expandButton=document.querySelector('#expand');
let letter='All', favouritesOnly=false, expanded=false, selected=null;
const storageKey='reverie-favourite-symbols-v1';
let favourites=new Set();
try{const saved=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(saved))favourites=new Set(saved.filter(name=>dreams.some(d=>d[0]===name)))}catch{document.querySelector('#save-status').textContent='Browser storage is unavailable. Favourites will last for this visit.'}
function toggleFavourite(title){
 if(favourites.has(title))favourites.delete(title);else favourites.add(title);
 try{localStorage.setItem(storageKey,JSON.stringify([...favourites]));document.querySelector('#save-status').textContent=`${title} ${favourites.has(title)?'added to':'removed from'} favourites. Saved only in this browser.`}catch{document.querySelector('#save-status').textContent='Favourites updated for this visit, but could not be saved in this browser.'}
 render();const button=[...results.querySelectorAll('.save')].find(b=>b.dataset.title===title);(button||favouriteButton).focus();
}
for(const value of ['All',...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']){const b=document.createElement('button');b.textContent=value;b.type='button';b.className='btn btn-outline-light';b.dataset.letter=value;b.setAttribute('aria-label',value==='All'?'Show all letters':`Symbols beginning with ${value}`);b.disabled=value!=='All'&&!dreams.some(d=>d[0].startsWith(value));b.addEventListener('click',()=>{letter=value;selected=null;search.value='';render()});alphabet.append(b)}
function filteredDreams(){const query=search.value.trim().toLowerCase();return dreams.filter(d=>(!selected||d[0]===selected)&&(letter==='All'||d[0].startsWith(letter))&&(!favouritesOnly||favourites.has(d[0]))&&[d[0],d[1],d[4]].join(' ').toLowerCase().includes(query))}
function render(){
 const filtered=filteredDreams();results.replaceChildren();
 for(const [title,theme,meaning,prompt] of filtered){
  const card=document.createElement('article');card.className='entry card card-body h-100 p-4';card.tabIndex=-1;
  const h=document.createElement('h3');h.textContent=title;h.id='symbol-'+dreams.findIndex(d=>d[0]===title);card.setAttribute('aria-labelledby',h.id);
  const tag=document.createElement('p');tag.className='theme';tag.textContent=theme;
  const desc=document.createElement('p');desc.className='meaning';desc.textContent=meaning;
  const save=document.createElement('button');save.className='save btn btn-outline-light';save.type='button';save.dataset.title=title;save.textContent='Save favourite';save.setAttribute('aria-pressed',String(favourites.has(title)));save.setAttribute('aria-label',`Save favourite: ${title}`);save.addEventListener('click',()=>toggleFavourite(title));
  const details=document.createElement('details'),summary=document.createElement('summary'),p=document.createElement('p');details.open=expanded;summary.textContent='Reflection question';summary.setAttribute('aria-label',`Reflection question for ${title}`);p.textContent=prompt;details.append(summary,p);card.append(h,tag,desc,save,details);const col=document.createElement('div');col.className='col';col.append(card);results.append(col);
 }
 document.querySelector('#count').textContent=`${filtered.length} ${filtered.length===1?'symbol':'symbols'} shown${favouritesOnly?' in favourites':''}${letter!=='All'?' beginning with '+letter:''}${search.value.trim()?' matching “'+search.value.trim()+'”':''}`;
 document.querySelector('#result-title').textContent=selected?'A symbol to explore':favouritesOnly?'Your favourites':search.value.trim()?'Search results':letter==='All'?'All dream symbols':`Dream symbols: ${letter}`;
 document.querySelector('#empty').hidden=filtered.length>0;
 document.querySelector('#empty h3').textContent=favouritesOnly&&favourites.size===0?'No favourites yet':'No symbols found';
 document.querySelector('#empty p').textContent=favouritesOnly&&favourites.size===0?'Choose “Save favourite” on any symbol to keep it close in this browser.':'Try a shorter word, such as “water” or “house”, or browse all symbols.';
 document.querySelector('#clear').hidden=!search.value;
 favouriteButton.textContent=`Favourites (${favourites.size})`;favouriteButton.setAttribute('aria-pressed',String(favouritesOnly));
 for(const button of alphabet.children)button.setAttribute('aria-pressed',String(button.dataset.letter===letter));
}
function resetFilters(){search.value='';letter='All';favouritesOnly=false;selected=null;render()}
function showRandomDream(){const choices=dreams.filter(d=>d[0]!==selected);resetFilters();selected=choices[Math.floor(Math.random()*choices.length)][0];render();results.querySelector('article').focus();}
search.addEventListener('input',()=>{letter='All';selected=null;render()});
document.querySelector('#clear').addEventListener('click',()=>{search.value='';letter='All';selected=null;render();search.focus()});
document.querySelector('#reset').addEventListener('click',()=>{resetFilters();search.focus()});
document.querySelector('#random').addEventListener('click',showRandomDream);
favouriteButton.addEventListener('click',()=>{favouritesOnly=!favouritesOnly;selected=null;search.value='';letter='All';render()});
expandButton.addEventListener('click',()=>{expanded=!expanded;for(const detail of results.querySelectorAll('details'))detail.open=expanded;expandButton.textContent=expanded?'Collapse all prompts':'Expand all prompts';expandButton.setAttribute('aria-pressed',String(expanded))});
window.addEventListener('storage',event=>{if(event.key===storageKey||event.key===null){try{const saved=JSON.parse(event.newValue||'[]');favourites=new Set(Array.isArray(saved)?saved.filter(name=>dreams.some(d=>d[0]===name)):[]);render()}catch{}}});
render();

document.querySelector('#show-all').addEventListener('click',()=>{resetFilters();document.querySelector('#result-title').tabIndex=-1;document.querySelector('#result-title').focus()});
