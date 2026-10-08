import { hasMismatch, measuredAmount, rowAmount, toDecimalString, toPesewas } from './calc';

let counter = 0;
export const newKey = () => `k${Date.now().toString(36)}${counter++}`;

const str = (v) => (v === null || v === undefined ? '' : String(v));

/** Server line item -> editable local item (all numbers as strings, plus a stable local key). */
export function fromServerItem(li) {
  const lump = li.type === 'LUMP_SUM';
  return {
    key: newKey(),
    description: li.description || '',
    type: li.type,
    qty: lump ? '1' : str(li.qty),
    unit: lump ? 'Item' : li.unit || '',
    rate: lump ? '' : str(li.rate),
    amount: lump ? str(li.amount) : '',
    enteredAmount: li.enteredAmount != null ? str(li.enteredAmount) : null,
    remarks: li.remarks || '',
  };
}

/** Local item -> PUT /claims/{id}/items payload. */
export function toServerItem(it) {
  if (it.type === 'LUMP_SUM') {
    return { type: 'LUMP_SUM', description: it.description, amount: toDecimalString(rowAmount(it)), remarks: it.remarks };
  }
  const body = { type: 'MEASURED', description: it.description, qty: it.qty === '' ? 0 : it.qty, unit: it.unit, rate: toDecimalString(toPesewas(it.rate)), remarks: it.remarks };
  if (it.enteredAmount !== null && it.enteredAmount !== undefined && it.enteredAmount !== '') {
    body.enteredAmount = String(it.enteredAmount).replace(/,/g, '');
  }
  return body;
}

export function blankItem(type = 'MEASURED', unit = '') {
  return {
    key: newKey(), description: '', type,
    qty: type === 'LUMP_SUM' ? '1' : '', unit: type === 'LUMP_SUM' ? 'Item' : unit,
    rate: '', amount: '', enteredAmount: null, remarks: '',
  };
}

/** Switch row type, carrying the current figure across so nothing is lost. */
export function switchType(it) {
  if (it.type === 'MEASURED') {
    return { ...it, type: 'LUMP_SUM', qty: '1', unit: 'Item', rate: '', amount: toDecimalString(measuredAmount(it)), enteredAmount: null };
  }
  return { ...it, type: 'MEASURED', qty: '1', unit: '', amount: '', rate: toDecimalString(rowAmount(it)), enteredAmount: null };
}

export { hasMismatch };
