import artifact from './model.json'
export const model = artifact
export const FEATURES = model.features
export function predict(values: number[]) {
  if (values.length !== 6 || values.some(v => !Number.isFinite(v))) throw new Error('All six features must be finite numbers.')
  const z = model.intercept + values.reduce((sum,v,i) => sum + v * model.coefficients[i],0)
  const ppm = Math.expm1(z)
  if (!Number.isFinite(ppm)) throw new Error('Prediction overflow: these inputs cannot be evaluated.')
  const warnings = values.flatMap((v,i) => {
    const p = model.featureProfile[FEATURES[i] as keyof typeof model.featureProfile]
    return v < p.min || v > p.max ? [`${FEATURES[i]} outside observed training range`] : []
  })
  if (ppm < 2 || ppm > 100) warnings.push('Prediction outside observed 2–100 ppm training coverage')
  return { ppm, warnings }
}
// Parse RFC-style quoted CSV, preserving embedded commas and newlines.
export function parseCSV(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false, closedQuote = false
  text = text.replace(/^\uFEFF/, '')
  for (let i=0;i<text.length;i++) {
    const c=text[i]
    if(closedQuote && c!==',' && c!=='\n' && c!=='\r') throw new Error('Unexpected text after CSV quote.')
    if(c==='"') { if(quoted && text[i+1]==='"'){cell+='"';i++} else if(quoted || !cell) { closedQuote=quoted; quoted=!quoted } else throw new Error('Unexpected quote in CSV.') }
    else if(c===',' && !quoted){row.push(cell);cell='';closedQuote=false}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';closedQuote=false}
    else cell+=c
  }
  if(quoted)throw new Error('Unclosed CSV quote.')
  row.push(cell);if(row.some(v=>v.trim()))rows.push(row)
  return rows
}
export function importFeatures(text:string) {
  const [header,...rows]=parseCSV(text)
  if(!header)throw new Error('CSV is empty.')
  const names=header.map(v=>v.trim().toLowerCase())
  if(new Set(names).size!==names.length)throw new Error('Duplicate CSV columns.')
  const indices=FEATURES.map(f=>names.indexOf(f.toLowerCase()))
  if(indices.some(i=>i<0))throw new Error(`Required columns: ${FEATURES.join(', ')}`)
  if(!rows.length)throw new Error('CSV has no sample rows.')
  return rows.map((r,i)=>{
    if(r.length!==header.length)throw new Error(`Row ${i+2}: column count differs from header.`)
    const values=indices.map(j=>{if(!r[j].trim())throw new Error(`Row ${i+2}: missing ${header[j]}.`);return Number(r[j])})
    const result=predict(values)
    return {id:r[names.indexOf('sample_id')] || `Sample ${i+1}`,values,...result}
  })
}
export function rgbToLab(rgb:number[]):number[] {
  const linear=rgb.map(v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4})
  const [r,g,b]=linear
  const xyz=[(0.4124564*r+0.3575761*g+0.1804375*b)/0.95047,0.2126729*r+0.7151522*g+0.072175*b,(0.0193339*r+0.119192*g+0.9503041*b)/1.08883]
  const [x,y,z]=xyz.map(v=>v>(6/29)**3?Math.cbrt(v):v/(3*(6/29)**2)+4/29)
  return [116*y-16,500*(x-y),200*(y-z)]
}
export function labStats(pixels:Uint8ClampedArray) {
  const channels:number[][]=[[],[],[]];let clipped=0
  for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]!==255)continue;const rgb=[pixels[i],pixels[i+1],pixels[i+2]];if(rgb.some(v=>v===0||v===255))clipped++;rgbToLab(rgb).forEach((v,j)=>channels[j].push(v))}
  const count=channels[0].length
  if(!count)throw new Error('No opaque pixels in this region.')
  const values=channels.flatMap(c=>{const mean=c.reduce((a,b)=>a+b,0)/count;c.sort((a,b)=>a-b);const middle=Math.floor(count/2);return [mean,count%2?c[middle]:(c[middle-1]+c[middle])/2]})
  return {values,count,clippedFraction:clipped/count}
}
export function csvCell(value:unknown){return '"'+String(value).replaceAll('"','""')+'"'}
export function download(name:string,content:string,type='text/plain') {
  const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
