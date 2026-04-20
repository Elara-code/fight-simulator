import { zh, type Dict } from './zh'

// single-locale for now; swap this when adding additional languages
const activeDict: Dict = zh

export function t(): Dict {
  return activeDict
}
