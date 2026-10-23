import pl001 from "./pl001-token-budget.js";
import pl002 from "./pl002-duplicate-content.js";
import pl003 from "./pl003-contradictory-directives.js";
import pl004 from "./pl004-vague-directive.js";
import pl005 from "./pl005-shouting-density.js";
import pl006 from "./pl006-excessive-emphasis.js";
import pl007 from "./pl007-unresolved-placeholder.js";
import pl008 from "./pl008-broken-relative-link.js";
import pl009 from "./pl009-exposed-secret.js";
import pl010 from "./pl010-long-paragraph.js";
import pl011 from "./pl011-excessive-heading-depth.js";
import pl012 from "./pl012-list-item-verb.js";
import pl013 from "./pl013-section-token-budget.js";

/**
 * All rules indexed by rule ID (PL001 - PL013)
 */
export const rules = {
  PL001: pl001,
  PL002: pl002,
  PL003: pl003,
  PL004: pl004,
  PL005: pl005,
  PL006: pl006,
  PL007: pl007,
  PL008: pl008,
  PL009: pl009,
  PL010: pl010,
  PL011: pl011,
  PL012: pl012,
  PL013: pl013
};

export const ruleList = Object.values(rules);

export default rules;
