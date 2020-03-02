'use strict'


const prefs = {
  title:   "Viewer",
  jpgDir:  "./jpg",
  pngDir:  "./png",

  filter:  "",
  index:   0,
  width:   300,
  smWidth: 90,
  lgWidth: 1200,
  ratio:   3/2,
  bgColor: "#ffffff",

  fotorama: {
    width: "100%",
    height: "100%",
    fit: "scaledown",
    shadows: false,
    keyboard: true,
    clicktransition: 'crossfade',
    nav: false
  }
};
const $controls = $('#controls');
$controls.on('change reset', changeParams);
$controls.on('change', '[name]', changeParams);
$controls.on('dblclick', 'label', resetControl);

const downloadBtn = document.getElementById('download-btn');
downloadBtn.disabled = true;
downloadBtn.addEventListener('click', download);
const downloadMap = new Map();

const $content = $('#content');
$content.on('change', 'section', function(ev) {
  setSectionFlag(this, undefined, true);
});
$content.on('click', '.thumb', function(ev) {
  ev.preventDefault();
  showViewer( $(this).index('.thumb') );
});
$content.on('click', '.thumb-flag', function(ev) {
  setTimeout(() => {
    setThumbFlag(this.closest('.thumb'));
    setSectionFlag(this.closest('section'));
  });
  return false;
});

const $viewer = $('#viewer');

const $fotorama = $viewer.children('.fotorama').fotorama(prefs.fotorama);
const fotorama = $fotorama.data('fotorama');
$fotorama.on('fotorama:show', showPhoto);
$fotorama.on('fotorama:showend', resetPhoto);

const $viewerThumbs = $viewer.children('.thumbs');
$viewerThumbs.on('click', 'a', pickViewerThumb);

let dataMap, props;
$(window).on('load hashchange', refresh);

$(window).on('popstate', function(ev) {
  if ($viewer.css('visibility') == 'visible') 
    hideViewer();
});

/***************************************************************************/
function refresh(event) {

  const sortNums = ([a], [b]) => 
    Number( a.match(/\d+/)[0] ) - Number( b.match(/\d+/)[0] );

  const defaults = JSON.parse( JSON.stringify(prefs) );
  const params = unserialize(window.location.hash);

  props = Object.assign(defaults, params);
  dataMap = Object.entries(data)//.sort(sortNums);
  // console.log(dataMap);

  refreshControls();
  refreshContent(event.type);
  // colorBackground(props.bgColor);
}
/***************************************************************************/
function refreshControls() {
  
  $controls.find('[name]').each(function(i, el) {
    el.value = props[el.name];
  });
}
/***************************************************************************/
function refreshContent(refreshEventType) {
  
  hideViewer();
  $content.empty();

  if (props.filter) {
    let re = RegExp('^'+ props.filter, 'i');
    dataMap = dataMap.filter( entry => re.test(entry[0]) );
  }
  if (!dataMap.length) {
    return $content.html('<h2>No data</h2>');
  }
  dataMap.forEach( entry => {
    $content.append( createSection(entry, props) );
  });
  if (refreshEventType == 'hashchange') 
    window.scrollTo(0, 0);
}
/***************************************************************************/
function createSection([sectionName, items], sectionChecked=true) {

  let params = unserialize(window.location.hash);
  params.filter = sectionName;

  let thumbs = document.createElement('div');
  thumbs.style.gridTemplateColumns = `repeat(auto-fill, ${props.width}px)`;
  thumbs.className = 'thumbs';

  for (let dirName in items) {

    let fileNames = items[dirName];
    let fileName = fileNames[props.index];
    if (!fileName) continue;

    let isChecked = downloadMap.has(dirName);
    if (!isChecked) sectionChecked = false;

    let thumb = createThumb(
      {sectionName, dirName, fileName, fileNames, isChecked}
    );
    if (thumb) thumbs.appendChild(thumb);
  }
  if (!thumbs.childNodes.length) return '';

  let header = document.createElement('h2');
  header.className = "section-header";
  header.innerHTML = '<label class="flag section-flag">'+
    '<input type="checkbox" class="checkbox"></label>'+
    `<a href="${serialize(params)}">${sectionName}</a>`;

  let section = document.createElement('section');
  $(section).append(header, thumbs);
  setSectionFlag(section, sectionChecked);

  return section;
}
/***************************************************************************/
function createThumb(thumbData) {

  const {sectionName, dirName, fileName, fileNames, isChecked} = thumbData;

  let thumb     = document.createElement('a'),
      figure    = document.createElement('figure'),
      img       = document.createElement('img'),
      caption   = document.createElement('figcaption'),
      textSpan  = document.createElement('span'),
      flagLabel = document.createElement('label'),
      checkbox  = document.createElement('input'),
      width     = prefs.width,
      pngPath   = `${prefs.pngDir}/${dirName}/masked/${width}/${fileName}.png`,
      jpgPath   = `${prefs.jpgDir}/${dirName}/${width}/${fileName}.jpg`;

  img.width = width;
  img.height = width / prefs.ratio;
  img.src = (props.bgColor != prefs.bgColor) ? pngPath : jpgPath;
  img.onerror = (ev) => { ev.target.src = 'viewer/broken.svg' };

  checkbox.className = checkbox.type = 'checkbox';
  checkbox.checked = isChecked;

  flagLabel.className = 'flag thumb-flag';
  flagLabel.appendChild(checkbox);

  textSpan.className = 'thumb-text';
  textSpan.innerHTML = '<em>'+ sectionName +'</em>'+ dirName.slice(3);

  caption.append(flagLabel, textSpan);
  figure.append(img, caption);

  $(thumb)
    .addClass('thumb')
    .toggleClass('checked', isChecked)
    .prop('href', `${prefs.jpgDir}/${dirName}/${fileName}.jpg`)
    .data(thumbData)
    .append(figure);

  return thumb;
}
/***************************************************************************/
function setSectionFlag(section, state, straight) {

  if (!straight) {
    if (!state) state = !section.querySelector('.thumb:not(.checked)');
    return changeFlag(section, state);
  }
  let isChecked = changeFlag(...arguments);
  section.querySelectorAll('.thumb').forEach(thumb => {
    if (thumb.classList.contains('checked') == isChecked) return;
    setThumbFlag(thumb, isChecked);
  });
}
/***************************************************************************/
function setThumbFlag(thumb, state) {

  let isChecked = changeFlag(...arguments);
  let {dirName, fileNames} = $(thumb).data();

  if (isChecked) downloadMap.set(dirName, fileNames);
  else downloadMap.delete(dirName);

  downloadBtn.disabled = !downloadMap.size;
}
/***************************************************************************/
function changeFlag(el, state, keepCheckbox=false) {

  let checkbox = el.querySelector('.checkbox');
  let isChecked = checkbox.checked = 
    (state != undefined) ? state : !!(checkbox.checked - !keepCheckbox);

  el.classList.toggle('checked', isChecked);
  return isChecked;
}
/***************************************************************************/
function showViewer(thumbIndex) {

  document.body.style.overflowY = 'hidden';
  
  if (!$viewer.data.loaded) {
    refreshViewer();
  }
  $viewer.css('visibility', 'visible');
  fotorama.show({ index: thumbIndex, time: 0 });
  history.pushState({},'');
}
/***************************************************************************/
function hideViewer(unload=true) {

  $viewer.css('visibility', 'hidden');
  document.title = (props.filter) ? props.filter +' - '+ prefs.title : prefs.title;
  document.body.style.overflowY = '';
  if (unload) $viewer.data.loaded = null;
}
/***************************************************************************/
function refreshViewer() {
  
  let data = [];

  dataMap.forEach( ([sectionName, items]) => {
    for (let dirName in items) {
      let fileName = items[dirName][props.index];
      if (!fileName) continue;
      let jpgPath = `${prefs.jpgDir}/${dirName}/${prefs.lgWidth}/${fileName}.jpg`;
      data.push({img: jpgPath});
    }
  });
  $viewer.data.loaded = fotorama.load(data);
}
/***************************************************************************/
function showPhoto(ev, fotorama) {

  let thumb = $('.thumb').get(fotorama.activeIndex),
      thumbData = $(thumb).data(),
      thumbsArr = data[thumbData.sectionName][thumbData.dirName],
      dir = `${prefs.jpgDir}/${thumbData.dirName}`;

  buildViewerThumbs(thumbsArr, dir);
  document.title = thumbData.dirName +' - '+ prefs.title;
}
/***************************************************************************/
function resetPhoto(ev) {
  
  let img = $fotorama.find('.fotorama__img[data-src]')[0];
  if (img) img.src = img.dataset.src;
}
/***************************************************************************/
function buildViewerThumbs(arr, dir) {

  if (arr.length <= 1) {
    return $viewerThumbs.empty();
  }
  for (var i=0, thumbsHTML=''; i < arr.length; i++) {
    let selected = (i == props.index) ? 'selected' : '';
    thumbsHTML += `<a 
      class="${selected}" href="${dir}/${prefs.lgWidth}/${arr[i]}.jpg">
        <img width="${prefs.smWidth}" height="${prefs.smWidth / prefs.ratio}"
          src="${dir}/${prefs.smWidth}/${arr[i]}.jpg">
    </a>`;
  }
  $viewerThumbs.html(thumbsHTML);
}
/***************************************************************************/
function pickViewerThumb(ev) {

  let img = $fotorama.find('.fotorama__active .fotorama__img')[0];

  img.dataset.src = img.dataset.src || img.src;
  img.src = this.href;
  this.classList.add('selected');
  $(this).siblings().removeClass('selected');

  return false;
}
/***************************************************************************/
function resetControl(ev) {
  
  let el = $(this).siblings('[name]')[0];

  if (!el) return;

  el.value = prefs[el.name] || el.defaultValue;
  changeParams(null, el);
}
/***************************************************************************/
function changeParams(ev, el) {

  if (ev && ev.type == 'reset')
    return window.location.hash = '';
  
  if (!el) el = ev.target;
  let params = unserialize(window.location.hash);
  params[el.name] = el.value;
  window.location.hash = serialize(params);
}
/***************************************************************************/
function serialize(object, prefix='#') {

  let array = Object.keys(object).reduce( (arr, key) => {
    arr.push( key +'='+ object[key] );
    return arr;
  }, [] );
  return prefix + array.join('&');
}
/***************************************************************************/
function unserialize(string) {

  if (!string) return {};

  let array = string.substr(1).split('&');

  return array.reduce( (acc, cur) => {
    let [key, value] = cur.split('=');
    acc[key] = value;
    return acc;
  }, {} );
}
/***************************************************************************/
function colorBackground(color) {
  
  const getLuma = (color) => {
    let hex = color.substr(1);
    let rgb = parseInt(hex, 16);
    return ( (rgb >> 16) & 0xff * 0.2126 ) + // red luminance
           ( (rgb >>  8) & 0xff * 0.7152 ) + // green luminance
           ( (rgb >>  0) & 0xff * 0.0722 )   // blue luminance
  };
  document.body.bgColor = color;
  document.body.classList.toggle('dark', getLuma(color) < 100);
}
/***************************************************************************/
function download(ev) {

  ev.preventDefault();

  let btn = ev.target;
  let keys=[], paths=[];

  downloadMap.forEach(( files, dirName ) => {
    keys.push(dirName);
    files.forEach(fileName => {
      paths.push(`${dirName}/${fileName}.jpg`);
    });
  });
  btn.disabled = true;
  saveZip( paths, composeName(keys) ).finally(function() {
    btn.disabled = false;
  });
}
/***************************************************************************/
function saveZip(filePaths, zipName='archive') {

  const zip = new JSZip();

  const addFile = async function(url) {
    let response = await fetch('jpg/'+ url);
    let content = await response.blob();
    zip.file(url, content);
  }
  let additions = [];
  filePaths.forEach(url => additions.push( addFile(url) ));

  return Promise.all(additions).then(function() {
    zip.generateAsync({type:'blob'}).then(content => {
      saveAs(content, zipName +'.zip');
    });
  });
}
/***************************************************************************/
function composeName(names, defaultName) {
  
  let name = names[0];

  for (let i = 1; i < names.length; i++) {
    let curName = names[i];
    let j = 1;
    while (j < curName.length) {
      if (curName[j] != name[j]) break;
      j++;
    }
    if (j < 2) return defaultName || (new Date()).toLocaleDateString('ru-RU');
    name = curName.substr(0, j);
  }
  return name;
}
/***************************************************************************/
