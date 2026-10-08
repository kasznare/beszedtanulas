// Selectors are scoped to the current game. Answer choices are never singled out before a solution.
const part = (at, target, motion) => ({at, target, motion});
const map = {
 guide_welcome: {target:'.home-welcome', parts:[part('Válassz', '.home-tile')]},
 guide_picture_menu: {parts:[part('képeket', '[data-open="topics"]'),part('szavakat', '[data-open="listening-game"]')]},
 guide_practice: {parts:[part('Egy szóval','[data-open="imitate"]'),part('két szóval','[data-open="two-word"]')]},
 guide_number_menu: {target:'.choice-art'},
 guide_topics: {target:'.topic-grid'}, guide_cards: {target:'.cards-grid'},
 guide_imitate: {parts:[part('Hallgasd meg','#play-model'),part('mondd utánam','#listen-btn')]},
 guide_phrase: {parts:[part('Hallgasd meg','#play-phrase'),part('mondd utánam','#listen-phrase-btn')]},
 guide_count: {parts:[part('tárgyakra','.counting-object'),part('Számoljuk','#number-symbol')]},
 guide_quiz: {target:'#number-question-play'}, guide_flip: {target:'.flip-card:not(.is-open)'},
 guide_listening_game: {parts:[part('Hallgasd meg','#listening-replay'),part('képét','#listening-answers')]},
 guide_teddy: {target:'.teddy-illustration',parts:[part('koppints','.teddy-plate')]},
 guide_dress: {target:'#dress-bear .teddy-illustration',parts:[part('Koppints','.dress-answers')]},
 logic_play_menu: {parts:[part('macival','[data-open="teddy-game"], [data-open="dress-game"]'),part('Meseligetbe','[data-open="meseliget"]'),part('kirakós','[data-open="furfangliget"]')]},
 logic_menu: {parts:[part('erdei boltot','[data-game="shop"]'),part('gép szabályát','[data-game="machine"]'),part('csomagszállító','[data-game="route"]')]},
 logic_shop_1: {parts:[part('Két kosár','.logic-basket'),part('A képek','.logic-order'),part('plusz','[data-delta="1"]'),part('mínusszal','[data-delta="-1"]'),part('Kész gombra','#logic-check')]},
 logic_shop_2: {parts:[part('rendelés','.logic-order'),part('plusz','[data-delta="1"]'),part('mínusz','[data-delta="-1"]'),part('Tedd bele','.logic-basket')]},
 logic_shop_3: {parts:[part('összesen','[data-order="total"]'),part('mennyivel több','[data-order="difference"]'),part('két kosárba','.logic-basket')]},
 logic_change: {target:'.logic-order',parts:[part('Tedd bele','.logic-basket')]},
 logic_shop_hint1: {target:'.logic-order'}, logic_shop_hint2:{parts:[part('pöttyök','.logic-fruit'),part('Tegyél hozzá','[data-delta="1"]'),part('vegyél el','[data-delta="-1"]'),part('vissza','#logic-undo')]},
 logic_shop_hint3: {target:'.logic-hint-text'},logic_shop_more:{target:'.logic-attention'},logic_shop_less:{target:'.logic-attention'},logic_shop_done:{target:'.logic-market-scene.is-delivered'},
 logic_machine_1: {parts:[part('példák','.logic-example'),part('műveletet','.logic-ops'),part('próbáld ki','#logic-trial'),part('két új szám','.logic-predictions')]},
 logic_machine_2: {parts:[part('mindhárom példában','.logic-example'),part('rakod össze','.logic-slots'),part('próbagombbal','#logic-trial'),part('két új szám','.logic-predictions')]},
 logic_machine_3: {parts:[part('két művelet','.logic-slots'),part('Koppints egy helyre','[data-slot]'),part('műveletet','.logic-ops'),part('Próbáld ki','#logic-trial'),part('két új esetet','.logic-predictions')]},
 logic_machine_hint1:{target:'.logic-example'},logic_machine_hint2:{target:'.logic-hint-text'},logic_machine_hint3:{target:'.logic-hint-text',parts:[part('két új eredményt','.logic-predictions')]},
 logic_machine_empty:{target:'[data-slot]'},logic_machine_fit:{target:'.logic-match',parts:[part('két új eredmény','.logic-predictions')]},logic_machine_retry:{target:'.logic-mismatch',parts:[part('műveleteken','.logic-ops')]},logic_machine_guess:{target:'.logic-predictions'},logic_machine_done:{target:'.logic-slots',motion:'machine'},
 logic_route_1: {parts:[part('rókának','.logic-fox'),part('csomagot','[data-parcel]'),part('házhoz','[data-destination]'),part('mezőkre','.logic-board'),part('próbagomb','#logic-check')]},
 logic_route_2: {parts:[part('csomagot','[data-parcel]'),part('házhoz','[data-destination]'),part('köveket','.logic-cell.blocked'),part('egész utat','.logic-board'),part('próbáld ki','#logic-check'),part('Visszavonással','#logic-undo')]},
 logic_route_3: {parts:[part('Mindkét csomagot','[data-parcel]'),part('házhoz','[data-destination]'),part('lépésszámba','.logic-step-count')]},
 logic_route_steps: {parts:[part('leírásból','.logic-route-briefing'),part('csomagok','[data-parcel]'),part('kövek','[data-blocked]'),part('ház','[data-destination]'),part('nyilakkal','.logic-directions'),part('lépéseket','.logic-path-plan'),part('próbagombbal','#logic-check')]},
 logic_route_steps_hint2: {target:'.logic-hint-route',parts:[part('nyilakkal','.logic-directions')]},
 logic_route_steps_hint3: {target:'.logic-hint-route'},
 logic_route_steps_restart: {parts:[part('Visszavonással','#logic-undo'),part('újratervezhetsz','#logic-clear'),part('segítségnél','.logic-hint-route')]},
 logic_route_hint1:{parts:[part('csomagokhoz','[data-parcel]'),part('házhoz','[data-destination]'),part('mezőkre','.logic-board')]},
 logic_route_hint2:{target:'.hint-cell'},logic_route_hint3:{target:'.hint-cell'},logic_route_restart_hint:{target:'#logic-undo'},logic_route_adjacent:{target:'.path-end'},logic_route_full:{target:'#logic-undo'},logic_route_missing:{target:'[data-parcel]:not(.on-path)'},logic_route_home:{target:'[data-destination]'},logic_route_done:{target:'[data-destination]'},
 mese_map:{parts:[part('almát','#meadow-garden'),part('terítsünk','#meadow-picnic'),part('piknikezni','#meadow-start')]},
 mese_serve:{parts:[part('állatnak','.meadow-animal'),part('tányért','.meadow-plate')]},
 mese_served:{target:'.meadow-plate'},mese_more:{target:'.meadow-basket'},mese_less:{target:'.meadow-basket-apples'},mese_count_help:{target:'.meadow-count-guide'},mese_plate_help:{target:'.needs-plate .meadow-plate'},mese_plate_more:{target:'.needs-plate'},
 mese_dressed:{target:'#meadow-bear'},mese_finish:{target:'.meadow-memory'},mese_free_finish:{target:'.meadow-memory'},mese_album:{target:'.meadow-memory'},mese_empty_album:{target:'.meadow-album-empty'},
 memory_start:{target:'.memory-board'},memory_hint:{target:'.memory-card.is-open'},memory_match:{target:'.memory-card.is-matched'},memory_done:{target:'.memory-progress'},
 pour_start:{parts:[part('Válassz poharat','.pour-cups'),part('öntés gombot','#pour-hold'),part('jelzésig','.pour-target')]},
 pour_tilt:{parts:[part('balra','#pour-bear'),part('jobbra','#pour-rabbit')]},
 pour_manual:{parts:[part('jelzésig','.pour-target'),part('elengedjük','#pour-hold')]},
 pour_two:{parts:[part('macinak','#pour-bear'),part('nyuszinak','#pour-rabbit'),part('jelzéseket','.pour-target')]},
 pour_bear_done:{target:'[data-pour-cup="0"]'},pour_rabbit_done:{target:'[data-pour-cup="1"]'},pour_done:{target:'.pour-cup[data-done="true"]'},
 pour_more:{target:'.pour-target'},pour_over:{target:'#pour-empty'},pour_centre:{target:'#pour-tilt'},
 puzzle_start:{parts:[part('Válassz egy darabot','.puzzle-tray'),part('koppints a helyére','.puzzle-board')]},puzzle_hint:{target:'.puzzle-board'},puzzle_retry:{target:'#puzzle-status'},puzzle_place:{target:'.puzzle-progress'},puzzle_done:{target:'.puzzle-board.is-complete'},
 workshop_menu:{parts:[part('Válogasd a tárgyakat','[data-game="sort"]'),part('folytasd a mintát','[data-game="pattern"]'),part('egyensúlyba a mérleget','[data-game="balance"]')]},
 workshop_sort_1:{target:'.ws-token',parts:[part('Koppints egy tárgyra','.ws-token'),part('hozzá illő tálcára','.ws-bin-target')]},
 workshop_sort_2:{target:'.ws-token',parts:[part('szín és a forma','.ws-bin-target'),part('Válassz egy tárgyat','.ws-token'),part('hozzá illő tálcára','.ws-bin-target')]},
 workshop_sort_3:{target:'.ws-token',parts:[part('szín és forma','.ws-bin-target'),part('másik méretű tárgyak','.ws-leaf-bin'),part('Koppints a tárgyra','.ws-token'),part('helyére','.ws-bin-target')]},
 workshop_only_big:{parts:[part('nagy tárgyak','.ws-large'),part('kis tárgyakat','.ws-small')]},
 workshop_only_small:{parts:[part('kis tárgyak','.ws-small'),part('nagy tárgyakat','.ws-large')]},
 workshop_pattern_1:{target:'.ws-pattern-thread',parts:[part('üres helyre','.ws-pattern-slot'),part('készletből','.ws-pattern-choices')]},
 workshop_pattern_2:{target:'.ws-pattern-thread',parts:[part('ismétlődő egységet','.ws-pattern-fixed'),part('üres helyre','.ws-pattern-slot'),part('válassz rá formát','.ws-pattern-choices')]},
 workshop_pattern_3:{target:'.ws-pattern-thread',parts:[part('üres helyre','.ws-pattern-slot'),part('készletből','.ws-pattern-choices')]},
 workshop_balance_1:{target:'.ws-scale',parts:[part('bal oldalon','.ws-balance-reference'),part('jobb oldalon','.ws-balance-tray'),part('egy rúdra','.ws-rods')]},
 workshop_balance_2:{target:'.ws-scale',parts:[part('Két különböző hosszúságú rudat','.ws-rods'),part('bal oldal','.ws-balance-reference'),part('Vissza is vehetsz','.ws-balance-tray')]},
 workshop_balance_3:{target:'.ws-scale',parts:[part('Három különböző hosszúságú rudat','.ws-rods'),part('bal oldal','.ws-balance-reference'),part('Rendezd át','.ws-balance-tray')]},
 workshop_target:{target:'.ws-balance-reference'},workshop_add_rod:{target:'.ws-hint-focus'},workshop_take_rod:{target:'.ws-hint-focus'},
};

export function narrationCue(id, screen) {
 if (map[id]) return map[id];
 if (id.startsWith('workshop_level_')) return {target:'.ws-levels'};
 if (id.startsWith('workshop_n_')) return {target:'.ws-balance-reference'};
 if (/^workshop_(sort|pattern|balance)_hint[23]$/.test(id)) return {target:'.ws-hint-focus'};
 if (id.startsWith('workshop_sort_')) return {target:'.ws-sort-layout'};
 if (id.startsWith('workshop_pattern_')) return {target:'.ws-pattern-thread'};
 if (id.startsWith('workshop_balance_')) return {target:'.ws-scale'};
 if (id.startsWith('mese_collect_')) return {parts:[part('almát','.meadow-orchard'),part('kosárba','.meadow-basket')]};
 if (id.startsWith('mese_collected_')) return {target:'.meadow-basket-apples'};
 if (id.startsWith('teddy_') || id==='guide_teddy_thanks') return {target:'.teddy-illustration'};
 if (id.startsWith('dress_request_')) return {target:screen==='meseliget'?'#meadow-bear .teddy-illustration':'#dress-bear .teddy-illustration'};
 if (id.startsWith('dress_thanks_')) return {target:`[data-garment="${id.slice(13)}"].is-worn`};
 if (id.startsWith('word_')) {
  if (screen==='imitate') return {target:'#imitate-emoji'};
  if (screen==='listening-game') return {target:'#listening-replay'};
 }
 if (id.startsWith('question_')) return {target:'#number-question-play'};
 if (id.startsWith('quantity_')) return {target:screen==='numbers'?'#number-count-view:not([hidden]) .counting-object, .number-answer.is-correct':null};
 if (id.startsWith('number_') || id.startsWith('logic_n_')) return {target:screen==='meseliget'?'.meadow-basket-apples':'#number-symbol'};
 if (id==='guide_listening') return {target:screen==='two-word'?'#listen-phrase-btn':'#listen-btn'};
 if (id==='guide_good') return {target:'.is-correct, #success-badge:not(.is-hidden), #phrase-success-badge:not(.is-hidden)'};
 if (id==='guide_again') return {target:screen==='listening-game'?'#listening-replay':screen==='numbers'?'#number-question-play':'#play-model'};
 return {};
}
