import datapack from './datapack.js'
import ror from './ror.js'
import cellosaurus from './cellosaurus.js'
import compoundcloud from './compoundcloud.js'
import pubchem from './pubchem.js'
import bao from './bao.js'
import aopwiki from './aopwiki.js'
import aopwikiEvents from './aopwiki-events.js'
import aopwikiRelationships from './aopwiki-relationships.js'
import orcid from './orcid.js'
import mimetypes from './mimetypes.js'

const lookups = {
  datapack,
  ror,
  cellosaurus,
  compoundcloud,
  compoundwiki: compoundcloud,
  pubchem,
  bao,
  aopwiki,
  aopwikiEvents,
  aopwikiRelationships,
  orcid,
  mimetypes
};

export default lookups
