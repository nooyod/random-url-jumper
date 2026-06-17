function extractId(
url,
mode,
paramName,
regex
){

try{

if(
mode==="param"
){

const u=
new URL(
url
);

const value=

u.searchParams.get(
paramName
);

return value
?
Number(
value
)
:
null;

}

if(
mode==="regex"
){

const m=

url.match(

new RegExp(
regex)

);

return m
?
Number(
m[1]
)
:
null;

}

const m=

url.match(

/\/(\d+)\/?$/

);

return m
?
Number(
m[1]
)
:
null;

}

catch{

return null;

}

}



export async function crawlBoard(){

const listUrl=

document
.getElementById(
"listUrl"
)
.value;

const selector=

document
.getElementById(
"linkSelector"
)
.value;

const mode=

document
.getElementById(
"extractMode"
)
.value;

const param=

document
.getElementById(
"paramName"
)
.value;

const regex=

document
.getElementById(
"regex"
)
.value;


const response=

await fetch(
listUrl
);

const html=

await response.text();

console.log(html.substring(0, 3000));

const dom=

new DOMParser()

.parseFromString(

html,

"text/html"

);

console.log(
    "링크 수:",
    dom.querySelectorAll(selector).length
);

const base=

new URL(
listUrl
);

const ids=[];

dom

.querySelectorAll(
selector
)

.forEach(

node=>{

const raw=

node.getAttribute(
"href"
);

console.log(
    "href:",
    raw
);

if(
!raw)
return;


// 상대주소 → 절대주소 변환
const href=

new URL(

raw,

base

)

.toString();


const id=

extractId(

href,

mode,

param,

regex

);


if(

id!==null

&&

!ids.includes(
id
)

){

ids.push(
id
);

}

}

);


return ids;

}