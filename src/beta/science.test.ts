import {describe,it,expect} from 'vitest'
import fixtures from './parity.json'
import {predict,rgbToLab,labStats,importFeatures,FEATURES,parseCSV} from './science'
describe('PLS browser inference',()=>{
 it('matches Python on every training row',()=>{for(const row of fixtures)expect(Math.abs(predict(row.features).ppm-row.expected)).toBeLessThan(1e-8)})
 it('rejects invalid input and preserves extrapolation',()=>{expect(()=>predict([NaN])).toThrow();const result=predict([0,0,0,0,0,0]);expect(result.warnings.length).toBeGreaterThan(0)})
 it('requires real medians and rejects blank or nonfinite cells',()=>{expect(()=>importFeatures('L_mean,A_mean,B_mean\n1,2,3')).toThrow();expect(()=>importFeatures(FEATURES.join(',')+'\n1,2,,4,5,6')).toThrow();expect(()=>importFeatures(FEATURES.join(',')+'\n1,2,Infinity,4,5,6')).toThrow()})
 it('accepts canonical features in arbitrary order and quoted sample identifiers',()=>{const csv=['sample_id',...FEATURES].join(',')+'\n"Well, one",'+fixtures[0].features.join(',');expect(importFeatures(csv)[0].id).toBe('Well, one')})
})
describe('sRGB D65 CIELAB',()=>{
 it('matches known black, white and red reference values',()=>{const black=rgbToLab([0,0,0]);expect(black[0]).toBeCloseTo(0,5);const white=rgbToLab([255,255,255]);expect(white[0]).toBeCloseTo(100,3);expect(white[1]).toBeCloseTo(0,3);const red=rgbToLab([255,0,0]);expect(red[0]).toBeCloseTo(53.2408,3);expect(red[1]).toBeCloseTo(80.0925,3);expect(red[2]).toBeCloseTo(67.2032,3)})
 it('computes pixel-level means and medians, ignoring transparency',()=>{const stats=labStats(new Uint8ClampedArray([0,0,0,255,255,255,255,255,255,0,0,0]));expect(stats.count).toBe(2);expect(stats.values[0]).toBeCloseTo(50,3);expect(stats.values[1]).toBeCloseTo(50,3);expect(()=>labStats(new Uint8ClampedArray([0,0,0,0]))).toThrow()})
})

describe('CSV interoperability',()=>{
 it('accepts UTF-8 BOM and CRLF exports',()=>{const csv='\uFEFF'+FEATURES.join(',')+'\r\n'+fixtures[0].features.join(',')+'\r\n';expect(importFeatures(csv)).toHaveLength(1)})
 it('preserves quoted commas, newlines and escaped quotes',()=>{expect(parseCSV('id,value\n"a, b\nc","a""b"')).toEqual([['id','value'],['a, b\nc','a"b']])})
 it('rejects text after a closing quote and unterminated quotes',()=>{expect(()=>parseCSV('"a"garbage,b')).toThrow();expect(()=>parseCSV('"a')).toThrow()})
 it('rejects duplicate columns and inconsistent row widths',()=>{expect(()=>importFeatures([...FEATURES,FEATURES[0]].join(',')+'\n1,2,3,4,5,6,7')).toThrow();expect(()=>importFeatures(FEATURES.join(',')+'\n1,2,3')).toThrow()})
})
