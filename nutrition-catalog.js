/* FORJA offline quick catalogue. Branded product facts originate from user-supplied screenshots.
 * Non-branded foods use generic approximate reference values, not exact FDC-ID matches.
 * Households measures are rough estimates; no food is recorded automatically.
 */
(function installNutritionCatalog(root) {
  'use strict';
  const N = root.ForjaNutrition;
  const source = () => ({
    name:'Referência nutricional genérica',
    reference:'Estimativas aproximadas de alimentos padrão; valores ainda não vinculados a FDC ID verificado',
    license:'Referência informativa',
  });
  const p = (id,label,grams,factor=1) => ({id,label,grams,factor});

  // Curated from the TACO/NEPA-Unicamp 4th edition (2011), Table 1, per 100 g of EDIBLE portion.
  // The source permits partial reproduction with attribution. Household measures below are
  // heuristics and are NOT measured portions from the TACO study; real recipes vary.
  const TACO_PORTIONS={
    bife:[p('small','1 bife pequeno (≈80 g prontos, sem osso)',80),p('medium','1 bife médio (≈120 g prontos, sem osso)',120),p('100g','100 g da parte comestível',100)],
    fritas:[p('small','1 porção pequena (≈80 g)',80),p('medium','1 porção média (≈120 g)',120),p('100g','100 g preparados',100)],
    batata:[p('medium','1 porção média (≈120 g)',120),p('100g','100 g preparados',100)],
    farofa:[p('spoon','1 colher de sopa (≈15 g)',15),p('two','2 colheres de sopa (≈30 g)',30),p('100g','100 g preparados',100)],
    arroz:[p('spoon','1 colher de servir (≈45 g)',45),p('two','2 colheres de servir (≈90 g)',90),p('100g','100 g cozidos',100)],
    feijao:[p('ladle','1 concha média (≈100 g)',100),p('half','½ concha média (≈50 g)',50),p('100g','100 g cozidos',100)],
    prato:[p('small','1 porção menor (≈120 g)',120),p('medium','1 porção média (≈200 g)',200),p('100g','100 g preparados',100)],
    salgado:[p('small','1 unidade pequena (≈70 g)',70),p('medium','1 unidade média (≈110 g)',110),p('100g','100 g preparados',100)],
    paoqueijo:[p('one','1 unidade média (≈35 g)',35),p('two','2 unidades médias (≈70 g)',70),p('100g','100 g preparados',100)],
    pao:[p('one','1 unidade média (≈50 g)',50),p('half','½ unidade (≈25 g)',25),p('100g','100 g',100)],
    paoforma:[p('slice','1 fatia (≈25 g)',25),p('two','2 fatias (≈50 g)',50),p('100g','100 g',100)],
    queijo:[p('slice','1 fatia (≈30 g)',30),p('two','2 fatias (≈60 g)',60),p('100g','100 g',100)],
    legumes:[p('medium','1 porção média (≈100 g)',100),p('small','1 porção menor (≈60 g)',60),p('100g','100 g',100)],
    salada:[p('small','1 porção pequena (≈40 g)',40),p('medium','1 porção média (≈80 g)',80),p('100g','100 g',100)],
    fruta:[p('one','1 porção média de polpa (≈100 g)',100),p('large','1 porção maior (≈150 g)',150),p('100g','100 g comestíveis',100)],
    ovo:[p('one','1 ovo médio preparado (≈50 g)',50),p('two','2 ovos preparados (≈100 g)',100),p('100g','100 g',100)],
  };
  const tacoRows = [[346,"Bife bovino — contrafilé sem gordura, grelhado","Carnes bovinas",194,35.9,0,4.5,null,"bife","bife boi bife de boi carne bovina carne de boi contrafile sem gordura"],[344,"Bife bovino — contrafilé com gordura, grelhado","Carnes bovinas",278,32.4,0,15.5,null,"bife","bife boi carne de boi contrafile com gordura"],[377,"Bife bovino — patinho grelhado","Carnes bovinas",219,35.9,0,7.3,null,"bife","bife de boi patinho bife bovino magro"],[381,"Picanha bovina com gordura, grelhada","Carnes bovinas",289,26.4,0,19.5,null,"bife","picanha bife churrasco carne boi"],[340,"Bife bovino à milanesa, frito","Carnes bovinas",352,20.6,12.2,24,0.4,"bife","bife empanado bife frito milanesa boi farinha rosca"],[429,"Bisteca suína grelhada (parte comestível)","Carnes suínas",280,28.9,0,17.4,null,"bife","bife porco bife de porco bisteca suina carne suina porco grelhado"],[428,"Bisteca suína frita (parte comestível)","Carnes suínas",311,33.7,0,18.5,null,"bife","bife porco bife de porco bisteca suina carne suina porco frito"],[432,"Lombo suíno assado","Carnes suínas",210,35.7,0,6.4,null,"bife","carne de porco lombo porco carne suina"],[435,"Pernil suíno assado","Carnes suínas",262,32.1,0,13.9,null,"bife","carne de porco pernil porco carne suina assada"],[410,"Filé de frango grelhado, sem pele","Frango e aves",159,32,0,2.5,null,"bife","frango grelhado peito frango filé frango frango na chapa"],[408,"Peito de frango cozido, sem pele","Frango e aves",163,31.5,0,3.2,null,"bife","frango cozido desfiado peito frango sem pele"],[401,"Filé de frango empanado à milanesa, frito","Frango e aves",221,28.5,7.5,7.8,1.1,"bife","frango empanado frango a milanesa file empanado filé empanado frango frito empanado"],[396,"Coxa de frango assada com pele","Frango e aves",215,28.5,0.1,10.4,null,"bife","coxa frango assado coxa de frango coxa assada"],[490,"Ovo frito","Ovos",240,15.6,1.2,18.6,null,"ovo","ovo frito ovo na frigideira"],[303,"Filé de merluza frito","Peixes",192,26.9,0,8.5,null,"bife","peixe frito merluza file peixe"],[306,"Filé de pescada empanado e frito","Peixes",283,21.4,5,19.1,null,"bife","peixe empanado pescada frita peixe a milanesa"],[93,"Batata frita em palitos (óleo)","Acompanhamentos",267,5,35.6,13.1,8.1,"fritas","batata frita batatas fritas batatinha frita fritas palito batata inglesa"],[91,"Batata inglesa cozida (sem óleo)","Acompanhamentos",52,1.2,11.9,null,1.3,"batata","batata cozida batata inglesa"],[88,"Batata-doce cozida","Acompanhamentos",77,0.6,18.4,0.1,2.2,"batata","batata doce cozida"],[132,"Mandioca frita (aipim)","Acompanhamentos",300,1.4,50.3,11.2,1.9,"fritas","mandioca frita aipim frito macaxeira frita"],[129,"Mandioca cozida (aipim)","Acompanhamentos",125,0.6,30.1,0.3,1.6,"batata","mandioca cozida aipim cozido macaxeira cozida"],[131,"Farofa de mandioca temperada","Acompanhamentos",406,2.1,80.3,9.1,7.8,"farofa","farofa farofa de mandioca farofa temperada"],[1,"Arroz integral cozido","Arroz e feijão",124,2.6,25.8,1,2.7,"arroz","arroz integral arroz cozido integral"],[561,"Feijão carioca cozido","Arroz e feijão",76,4.8,13.6,0.5,8.5,"feijao","feijao carioca feijão carioca feijão marrom feijao marrom"],[567,"Feijão-preto cozido (referência brasileira)","Arroz e feijão",77,4.5,14,0.5,8.4,"feijao","feijao preto feijão preto feijão-preto caldo feijao"],[539,"Feijão tropeiro mineiro","Pratos brasileiros",152,10.2,19.6,6.8,3.6,"prato","tropeiro feijao tropeiro feijão tropeiro mineiro"],[540,"Feijoada (referência TACO)","Pratos brasileiros",117,8.7,11.6,6.5,5.1,"prato","feijoada feijao com carne"],[542,"Macarrão à bolonhesa pronto","Pratos brasileiros",120,4.9,22.5,0.9,0.8,"prato","macarrao macarrão espaguete bolonhesa macarronada massa com carne"],[533,"Cuscuz de milho cozido, com sal","Pratos brasileiros",113,2.2,25.3,0.7,2.1,"prato","cuscuz milho cuscuz nordestino cuscuz de milho"],[537,"Estrogonofe de carne","Pratos brasileiros",173,15,3,10.8,null,"prato","strogonoff stroganoff strogonofe carne estrogonofe"],[538,"Estrogonofe de frango","Pratos brasileiros",157,17.6,2.6,8,null,"prato","strogonoff stroganoff strogonofe frango estrogonofe"],[386,"Coxinha de frango frita","Salgados e lanches",283,9.6,34.5,11.8,5,"salgado","coxinha coxinha frango salgado frito"],[56,"Pastel de carne frito","Salgados e lanches",388,10.1,43.8,20.1,1,"salgado","pastel de carne pastel frito pastelzinho"],[140,"Pão de queijo assado","Salgados e lanches",363,5.1,34.2,24.6,0.6,"paoqueijo","pao de queijo pão queijo pãozinho de queijo"],[53,"Pão francês (pão de sal)","Pães",300,8,58.6,3.1,2.3,"pao","pão francês pão de sal pãozinho pão careca cacetinho pao frances"],[52,"Pão de forma integral","Pães",253,9.4,49.9,3.7,6.9,"paoforma","pão integral pão de forma integral sanduiche"],[461,"Queijo minas frescal","Queijos",264,17.4,3.2,20.2,null,"queijo","queijo minas queijo fresco queijo minas frescal"],[463,"Queijo muçarela (mozarela)","Queijos",330,22.6,3,25.2,null,"queijo","queijo mussarela queijo muçarela mozzarella mozarela fatia queijo"],[100,"Brócolis cozido","Legumes e verduras",25,2.1,4.4,0.5,3.4,"legumes","brocolis brócolis verdura"],[109,"Cenoura cozida","Legumes e verduras",30,0.8,6.7,0.2,2.6,"legumes","cenoura cozida cenoura"],[157,"Tomate cru, com sementes","Legumes e verduras",15,1.1,3.1,0.2,1.2,"salada","tomate salada tomate cru"],[78,"Alface crespa crua","Legumes e verduras",11,1.3,1.7,0.2,1.8,"salada","alface salada alface crespa"],[182,"Banana-prata crua","Frutas",98,1.3,26,0.1,2,"fruta","banana prata banana-prata"],[222,"Maçã Fuji com casca","Frutas",56,0.3,15.2,null,1.3,"fruta","maca maçã fuji fruta"],[225,"Mamão Formosa cru","Frutas",45,0.8,11.6,0.1,1.8,"fruta","mamão mamao formosa"],[545,"Salada de legumes com maionese","Pratos brasileiros",96,1.1,8.9,7,2.2,"prato","salada de maionese maionese de batata"],[546,"Salada de legumes cozidos no vapor","Acompanhamentos",35,2,7.1,0.3,2.5,"legumes","legumes no vapor seleta legumes cozidos"],[547,"Salpicão de frango","Pratos brasileiros",148,13.9,4.6,7.8,0.4,"prato","salpicao salpicão de frango salada frango"],[525,"Acarajé","Pratos brasileiros",289,8.3,19.1,19.9,9.4,"salgado","acaraje acarajé baiano"],[526,"Arroz carreteiro","Pratos brasileiros",154,10.8,11.6,7.1,1.5,"prato","arroz carreteiro arroz com carne"],[527,"Baião de dois","Pratos brasileiros",136,6.2,20.4,3.2,5.1,"prato","baiao baião de dois arroz feijão"],[529,"Bife à cavalo com contrafilé e ovo","Pratos brasileiros",291,23.7,0,21.1,null,"bife","bife cavalo bife com ovo bife a cavalo"],[530,"Bolinho de arroz frito","Salgados e lanches",274,8,41.7,8.3,2.7,"salgado","bolinho arroz bolinho de arroz salgado frito"]];
  const tacoFoods=tacoRows.map(([number,name,category,kcal,protein,carbs,fat,fiber,measure,aliases])=>({
    id:'taco:2011:'+number,name,category,aliases:[aliases],
    preparation:/cru|crua|com casca|banana|maçã|mamão/i.test(name)?'raw':/queijo|pão de forma|pão francês/i.test(name)?'other':'cooked',
    note:'TACO 4ª ed. (2011), alimento nº '+number+'. Composição por 100 g da parte comestível; preparo e gordura adicionada podem mudar os valores. Porções domésticas são aproximadas.'+
      (/frit|milanesa|empanad/i.test(name)?' A quantidade de óleo e o empanamento variam em casa e restaurantes.':''),
    nutrientsPer100g:{energyKcal:kcal,proteinG:protein,carbsG:carbs,fatG:fat,fiberG:fiber},
    source:{
      name:'NEPA/UNICAMP — TACO',
      reference:'Tabela TACO 4ª ed. (2011), item '+number+'; https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf',
      license:'Reprodução permitida com citação da fonte (NEPA/UNICAMP).',
    },
    portions:TACO_PORTIONS[measure].map(portion=>({...portion})),
  }));

  // Sweets with reference values and explicitly modelled recipes.
  // TBCA values are used only to guide rounded, independent estimates (not copied as official branded facts).
  const sweetFoods=[
    {
      id:'taco:2011:16',name:'Bolo de chocolate simples, pronto (sem cobertura)',category:'Doces e bolos',
      aliases:['bolo chocolate','fatia bolo chocolate','bolo simples de chocolate','fatia de bolo de chocolate','bolo sem cobertura'],preparation:'cooked',
      note:'Bolo pronto de chocolate sem recheio ou cobertura — TACO item 16. Recheio, calda e cobertura devem ser adicionados separadamente.',
      nutrientsPer100g:{energyKcal:410,proteinG:6.2,carbsG:54.7,fatG:18.5,fiberG:1.4},
      source:{name:'NEPA/UNICAMP — TACO',reference:'Tabela TACO 4ª ed. (2011), item 16; https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf',license:'Reprodução com citação NEPA/UNICAMP'},
      portions:[p('slice','1 fatia aproximada (≈80 g)',80),p('100g','100 g',100)],
    },
    {
      id:'recipe:brigadeiro-caseiro',name:'Brigadeiro de chocolate caseiro (estimativa)',category:'Doces e bolos',
      aliases:['brigadeiro','docinho chocolate','brigadeiro tradicional'],preparation:'cooked',
      note:'Receitas e granulado mudam a composição. Aproximação por 100 g baseada em ingredientes típicos; não é tabela oficial nem receita aferida.',
      nutrientsPer100g:{energyKcal:null,proteinG:null,carbsG:null,fatG:null},
      estimateGramsBase:100,
      estimate:{confidence:'low',servingLabel:'100 g de brigadeiro',
        assumptions:'Estimativa de receita tradicional com leite condensado, chocolate e manteiga, usando referências de composição. Varia conforme receita, granulados e tamanho.',
        low:{energyKcal:330,proteinG:4,carbsG:48,fatG:10},central:{energyKcal:385,proteinG:6.3,carbsG:57.8,fatG:14.6},high:{energyKcal:450,proteinG:8,carbsG:66,fatG:21}},
      source:{name:'Estimativa de receita tradicional',reference:'Referências TACO de ingredientes e TBCA BRC0190K consultada como parâmetro; não constitui ficha oficial reproduzida',license:'Estimativa independente'},
      portions:[p('one','1 docinho médio (≈25 g)',25,0.25),p('100g','100 g',100,1)],
    },
    {
      id:'recipe:brigadeiro-morango',name:'Brigadeiro com morango (estimativa)',category:'Doces e bolos',
      aliases:['brigadeiro com morango','brigadeiro de morango','bombom de morango brigadeiro','brigadeiro morango'],preparation:'cooked',
      note:'Mistura ilustrativa com 80% brigadeiro de chocolate e 20% morango fresco. Bombom com cobertura de chocolate ou creme branco pode ter valores diferentes.',
      nutrientsPer100g:{energyKcal:null,proteinG:null,carbsG:null,fatG:null},
      estimateGramsBase:100,
      estimate:{confidence:'low',servingLabel:'100 g de brigadeiro com morango',
        assumptions:'Hipótese: 80 g de brigadeiro e 20 g de morango em cada 100 g. O recheio/cobertura real varia; cenário não substitui rótulo.',
        low:{energyKcal:260,proteinG:3.2,carbsG:39,fatG:8},central:{energyKcal:315,proteinG:5.2,carbsG:47,fatG:11.7},high:{energyKcal:390,proteinG:7,carbsG:58,fatG:18}},
      source:{name:'Estimativa de receita composta',reference:'Hipótese de receita brigadeiro e morango; ver docs/brasilian-food-catalog.md',license:'Estimativa independente'},
      portions:[p('one','1 unidade estimada (≈35 g)',35,0.35),p('100g','100 g',100,1)],
    },
  ];

  // Rótulos Growth consultados em 2026-11-15, fonte oficial por linha/sabor.
  // O catálogo registra SOMENTE o pó; líquido e acompanhamentos são itens independentes.
  // Composição por 100 g convertida linearmente da dose de 30 ou 40 g da tabela oficial.
  const GROWTH_OFFICIAL_ROWS=[{"id":"top-natural","line":"Whey Protein Concentrado (TOP)","flavor":"Natural","g":30,"k":126,"p":24,"c":3.1,"f":2,"fi":0,"url":"https://www.gsuplementos.com.br/whey-protein/","reference":"Comparativo oficial Growth: Whey Concentrado, sabor natural, porção de 30 g"},{"id":"isolate-natural","line":"Whey Protein Isolado","flavor":"Natural","g":30,"k":112,"p":27,"c":1,"f":0,"fi":0,"url":"https://www.gsuplementos.com.br/whey-protein/","reference":"Comparativo oficial Growth: Whey Isolado, sabor natural, porção de 30 g"},{"id":"hydro-natural","line":"Whey Protein Hidrolisado","flavor":"Natural","g":30,"k":115,"p":27,"c":0.6,"f":0.5,"fi":0,"url":"https://www.gsuplementos.com.br/whey-protein-hidrolisado-1kg-sabor-natural-growth-supplements-p985872"},{"id":"medium-natural","line":"Medium Whey","flavor":"Natural","g":30,"k":121,"p":17,"c":8.7,"f":2,"fi":0,"url":"https://www.gsuplementos.com.br/medium-whey-protein-1kg-growth-supplements-p986001"},{"id":"basic-natural","line":"Basic Whey","flavor":"Natural","g":30,"k":118,"p":10,"c":15,"f":2,"fi":0,"url":"https://www.gsuplementos.com.br/basic-whey-protein-1kg-natural"},{"id":"100-chocolate","line":"100% Whey Protein Concentrado","flavor":"Chocolate","g":30,"k":121,"p":21,"c":4.5,"f":2.1,"fi":0,"url":"https://www.gsuplementos.com.br/100-whey-protein-concentrado-chocolate"},{"id":"100-baunilha","line":"100% Whey Protein Concentrado","flavor":"Baunilha","g":30,"k":120,"p":21,"c":4.6,"f":2,"fi":0,"url":"https://www.gsuplementos.com.br/100-whey-protein-concentrado-baunilha"},{"id":"100-morango","line":"100% Whey Protein Concentrado","flavor":"Morango","g":30,"k":121,"p":21,"c":4.7,"f":2,"fi":0,"url":"https://www.gsuplementos.com.br/100-whey-protein-concentrado-morango"},{"id":"3w-chocolate","line":"3W Whey Protein","flavor":"Chocolate","g":30,"k":118,"p":24,"c":2.5,"f":1.3,"fi":0,"url":"https://www.gsuplementos.com.br/3-whey-protein-1kg-growth-supplements-p985944"},{"id":"zero-natural","line":"Whey Protein Zero Lactose","flavor":"Natural","g":30,"k":120,"p":23,"c":2.3,"f":2.1,"fi":0,"url":"https://www.gsuplementos.com.br/whey-protein-zero-lactose"},{"id":"daily-doce-de-leite","line":"Daily Whey","flavor":"Doce de Leite","g":40,"k":149,"p":22,"c":11,"f":1.9,"fi":0,"url":"https://www.gsuplementos.com.br/daily-whey-doce-de-leite"},{"id":"daily-baunilha","line":"Daily Whey","flavor":"Baunilha","g":40,"k":153,"p":22,"c":12,"f":1.9,"fi":0,"url":"https://www.gsuplementos.com.br/daily-whey-baunilha"},{"id":"daily-zero-chocolate","line":"Daily Whey Zero Lactose","flavor":"Chocolate","g":40,"k":172,"p":25,"c":9.6,"f":2.3,"fi":6.6,"url":"https://www.gsuplementos.com.br/daily-whey-zero-lactose-chocolate"},{"id":"daily-zero-doce-de-leite","line":"Daily Whey Zero Lactose","flavor":"Doce de Leite","g":40,"k":169,"p":24,"c":10,"f":2.2,"fi":6.4,"url":"https://www.gsuplementos.com.br/daily-whey-zero-lactose-doce-de-leite"},{"id":"gourmet-tiramisu","line":"Whey Gourmet","flavor":"Tiramisù","g":40,"k":153,"p":22,"c":12,"f":1.9,"fi":0,"url":"https://www.gsuplementos.com.br/kit-whey-gourmet-400g-e-creatina-monohidratada-250g","reference":"Tabela Whey Gourmet, sabor Tiramisù, no kit oficial da Growth, porção 40 g"},{"id":"sache-natural","line":"Whey Protein Concentrado Sachê","flavor":"Natural","g":30,"k":124,"p":24,"c":2.3,"f":2.1,"fi":0,"url":"https://www.gsuplementos.com.br/dose-whey-protein-concentrado-30gr"}];
  const growthFoods=GROWTH_OFFICIAL_ROWS.map(row=>{
    const per100=value=>Math.round(value*100/row.g*10000)/10000;
    const safeFlavor=row.flavor.toLowerCase();
    return {
      id:'growth:official:'+row.id,
      name:'Growth — '+row.line+' ('+row.flavor+')',
      category:'Suplementos',
      aliases:['growth whey','whey growth',row.line,row.flavor,'growth '+row.line+' '+row.flavor,
        ...(row.id==='top-natural'?['whey concentrado top 80','whey 80 natural']:[]),
        ...(row.id==='isolate-natural'?['whey isolado']:[]),
        ...(row.id==='hydro-natural'?['whey hidrolisado']:[])],
      preparation:'other',
      note:'Tabela nutricional oficial da Growth consultada em 15/11/2026: '+row.g+' g de pó = '+
        row.k+' kcal, '+row.p+' g proteínas, '+row.c+' g carboidratos, '+row.f+' g gorduras. '+
        'Este é o sabor '+row.flavor+'. Confira o rótulo do seu lote; água não adiciona nutrientes, leite e misturas devem ser registrados separadamente.',
      nutrientsPer100g:{
        energyKcal:per100(row.k),proteinG:per100(row.p),
        carbsG:per100(row.c),fatG:per100(row.f),fiberG:per100(row.fi)
      },
      source:{
        name:'Growth Supplements — tabela nutricional oficial',
        reference:(row.reference||'Tabela Growth de '+row.line+', '+row.flavor+', '+row.g+' g')+'; '+row.url,
        license:'Valores factuais do rótulo oficial; conferir atualizações na fonte'
      },
      portions:[
        p('dose','1 dose do rótulo ('+row.g+' g de pó)',row.g),
        p('half','½ dose ('+(row.g/2)+' g de pó)',row.g/2),
        p('100g','100 g de pó',100),
      ],
    };
  });


  // Liquid-only recipes: per millilitre from a stated serving on the cited source.
  // No implied mL-to-grams conversion; TACO coffee is explicitly approximate density.
  const LIQUID_LABELS=[{"id":"itambe-uht-desnatado","name":"Leite desnatado UHT Itambé","aliases":["leite desnatado","leite magro","leite zero gordura","itambe desnatado"],"serving":200,"kcal":65,"protein":6.8,"carbs":9.6,"fat":0,"fiber":0,"url":"https://www.itambe.com.br/portal/produto/leite-uht-desnatado-1l","brand":"Itambé — rótulo oficial","note":"Rótulo UHT Itambé, 200 ml. Este item corresponde ao leite, não ao whey; use volume real. Contém lactose."},{"id":"itambe-uht-integral","name":"Leite integral UHT Itambé","aliases":["leite integral","leite de vaca integral","itambe integral"],"serving":200,"kcal":118,"protein":6.6,"carbs":9.3,"fat":6,"fiber":0,"url":"https://www.itambe.com.br/portal/produto/leite-uht-integral-1l","brand":"Itambé — rótulo oficial","note":"Rótulo UHT Itambé, 200 ml. Este item corresponde ao leite, não ao whey; use volume real. Contém lactose."},{"id":"cafe-coado-sem-acucar","name":"Café coado, sem açúcar (referência TACO)","aliases":["cafe","café","cafe preto","café preto","cafe sem acucar","café sem açúcar","cafe puro","café coado"],"serving":100,"kcal":9,"protein":0.7,"carbs":1.5,"fat":0.1,"fiber":null,"url":"https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf","brand":"NEPA/UNICAMP — TACO (aproximação por ml)","note":"TACO nº 471: infusão de café 10% sem açúcar, por 100 g. Para facilitar lançamento em ml, adota-se densidade aproximada 1 g/ml, não aferida; preparo mais fraco/forte altera os valores. Açúcar e leite devem ser adicionados separadamente."},{"id":"monster-zero-sugar-473ml","name":"Monster Energy Zero Sugar, lata 473 ml","aliases":["monster zero","monster 0","monster zero sugar","monster preto zero","energético zero"],"serving":200,"kcal":3,"protein":0,"carbs":1.4,"fat":0,"fiber":0,"url":"https://www.paodeacucar.com/produto/1623422/energetico-zero-acucar-monster-lata-473ml","brand":"Tabela do varejista Pão de Açúcar","note":"Monster Zero Sugar 473 ml (não é Ultra White). Tabela do varejista por 200 ml: 3 kcal, 1,4 g carboidratos, sem quantidades significativas de proteína, gordura e fibras. Confira o rótulo da sua lata, pois fórmulas podem variar."},{"id":"monster-ultra-white-473ml","name":"Monster Energy Zero Ultra White, lata 473 ml","aliases":["monster ultra","monster ultra white","monster branco","monster 0 white","monster zero ultra","energetico monster branco"],"serving":473,"kcal":14,"protein":null,"carbs":null,"fat":null,"fiber":null,"url":"https://www.monsterenergy.com/pt-br/energy-drinks/monster-ultra/monster-energy-zero-ultra/","brand":"Monster Energy — página oficial","note":"Marca informa 14 kcal e 0 g de açúcares totais por lata. O site não informa macros completos: proteínas, carboidratos, gorduras e fibras ficam desconhecidos, não zero. Confirmar com rótulo se necessário."}];
  const drinkFoods=LIQUID_LABELS.map(row=>{
    const perMl=value=>value==null?null:Math.round(value/row.serving*10000000)/10000000;
    return {
      id:'drink:'+row.id,name:row.name,category:'Bebidas e leite',
      aliases:row.aliases,preparation:'other',
      note:row.note,
      nutrientsPer100g:{energyKcal:null,proteinG:null,carbsG:null,fatG:null,fiberG:null},
      nutrientsPerMl:{
        energyKcal:perMl(row.kcal),proteinG:perMl(row.protein),
        carbsG:perMl(row.carbs),fatG:perMl(row.fat),fiberG:perMl(row.fiber)
      },
      source:{name:row.brand,reference:'Informação por '+row.serving+' ml; '+row.url,
        license:'Informação de referência do rótulo/página, consultar a fonte'},
      portions:[
        p('serving',row.serving+' ml',null),
        p('half',(row.serving/2)+' ml',null),
        p('100ml','100 ml',null)
      ]
    };
  });

  const foods = [
    {
      id:'local:doce-cascao-acai-trufado-branco-500ml',
      name:'Doce Cascão — Açaí trufado Branco 500 ml',category:'Sobremesas',
      aliases:['açaí','acai','trufado','branco','ninho','doce cascao','doce cascão','sorveteria'],preparation:'other',
      note:'Estimativa não oficial. Açaí com creme Ninho em camadas e raspas de chocolate branco. O copo tem 500 ml; peso e receita não foram informados.',
      nutrientsPer100g:{energyKcal:null,proteinG:null,carbsG:null,fatG:null},
      source:{name:'Estimativa nutricional independente',reference:'Vitafrut, Nestlé Professional e referência de chocolate branco; ver docs/acai-estimates.md',license:'Estimativa, não é rótulo da loja'},
      estimate:{
        confidence:'low',servingLabel:'1 copo inteiro de 500 ml',
        assumptions:'Base: 300 g açaí com guaraná + 90 g creme Ninho + 15 g raspas brancas. Variação: 250–350 g açaí, 60–120 g creme, 10–25 g chocolate.',
        central:{energyKcal:814.4,proteinG:9.9,carbsG:132.8,fatG:26.8},
        low:{energyKcal:615.4,proteinG:7,carbsG:100.8,fatG:20.3},
        high:{energyKcal:1040.8,proteinG:13.1,carbsG:167.8,fatG:34.9},
      },
      portions:[p('whole','1 copo inteiro (500 ml)',null,1),p('half','½ copo (≈250 ml, divisão proporcional)',null,0.5)],
    },
    {
      id:'local:doce-cascao-acai-trufado-preto-500ml',
      name:'Doce Cascão — Açaí trufado Preto 500 ml',category:'Sobremesas',
      aliases:['açaí','acai','trufado','preto','avelã','avela','doce cascao','doce cascão','sorveteria'],preparation:'other',
      note:'Estimativa não oficial. Açaí com creme de avelã em camadas e raspas de chocolate. O copo tem 500 ml; peso e receita não foram informados.',
      nutrientsPer100g:{energyKcal:null,proteinG:null,carbsG:null,fatG:null},
      source:{name:'Estimativa nutricional independente',reference:'Vitafrut, Nutella (referência), Nestlé chocolate; ver docs/acai-estimates.md',license:'Estimativa, não é rótulo da loja'},
      estimate:{
        confidence:'low',servingLabel:'1 copo inteiro de 500 ml',
        assumptions:'Base: 300 g açaí com guaraná + 90 g creme de avelã + 15 g raspas de chocolate ao leite. Variação: 250–350 g açaí, 60–120 g creme, 10–25 g chocolate.',
        central:{energyKcal:1003.4,proteinG:8.9,carbsG:134.3,fatG:46.9},
        low:{energyKcal:741.4,proteinG:6.4,carbsG:101.8,fatG:33.7},
        high:{energyKcal:1292.2,proteinG:11.8,carbsG:169.6,fatG:61.8},
      },
      portions:[p('whole','1 copo inteiro (500 ml)',null,1),p('half','½ copo (≈250 ml, divisão proporcional)',null,0.5)],
    },
    {
      id:'local:doce-cascao-adicional-ninho',
      name:'Adicional de creme Ninho (≈20 g, estimativa)',category:'Adicionais',
      aliases:['adicional','ninho','creme ninho','recheio ninho'],preparation:'other',
      note:'Registrar à parte somente se você adicionou creme extra. 20 g são uma hipótese, não a porção medida pela loja.',
      nutrientsPer100g:{energyKcal:null,proteinG:null,carbsG:null,fatG:null},
      source:{name:'Estimativa por ingrediente',reference:'Recheio Ninho Nestlé Professional; consultar docs/acai-estimates.md',license:'Estimativa, não é rótulo da loja'},
      estimate:{
        confidence:'low',servingLabel:'1 colher estimada de 20 g',
        assumptions:'Referência de recheio Ninho (330 kcal/100 g); quantidade aproximada 20 g, intervalo 15–25 g.',
        central:{energyKcal:66,proteinG:1.5,carbsG:11.2,fatG:1.7},
        low:{energyKcal:49.5,proteinG:1.1,carbsG:8.4,fatG:1.3},
        high:{energyKcal:82.5,proteinG:1.9,carbsG:14,fatG:2.1},
      },
      portions:[p('extra','1 adicional estimado (≈20 g)',null,1)],
    },
    {
      id:'local:doce-cascao-adicional-avela',
      name:'Adicional de creme de avelã (≈20 g, estimativa)',category:'Adicionais',
      aliases:['adicional','avelã','avela','creme avelã','creme avela'],preparation:'other',
      note:'Registrar à parte somente se adicionou creme extra. Referência de creme de avelã tipo Nutella; produto da loja pode variar.',
      nutrientsPer100g:{energyKcal:null,proteinG:null,carbsG:null,fatG:null},
      source:{name:'Estimativa por ingrediente',reference:'Informação nutricional Nutella Brasil; consultar docs/acai-estimates.md',license:'Estimativa, não é rótulo da loja'},
      estimate:{
        confidence:'low',servingLabel:'1 colher estimada de 20 g',
        assumptions:'Referência de creme de avelã (542 kcal/100 g); quantidade aproximada 20 g, intervalo 15–25 g.',
        central:{energyKcal:108.4,proteinG:1.3,carbsG:11.6,fatG:6.2},
        low:{energyKcal:81.3,proteinG:0.9,carbsG:8.7,fatG:4.7},
        high:{energyKcal:135.5,proteinG:1.6,carbsG:14.5,fatG:7.8},
      },
      portions:[p('extra','1 adicional estimado (≈20 g)',null,1)],
    },

    {
      id:'photo:itambe-zero-morango-200g',name:'Itambé zero lactose morango, pote 200 g',category:'Laticínios',
      aliases:['itambe','itambé','iogurte','morango','zero lactose'],preparation:'other',
      note:'Informações mostradas na captura enviada: 200 g = 52 kcal, 6 g de proteína, 7 g de carboidratos, 0 g de gorduras. Confira a embalagem ao recomprar.',
      nutrientsPer100g:{energyKcal:null,proteinG:null,carbsG:null,fatG:null},
      nutrientsPerServing:{energyKcal:52,proteinG:6,carbsG:7,fatG:0},
      source:{name:'Captura enviada pelo usuário',reference:'Iogurte Itambé zero lactose morango, porção 200 g',license:'Valores transcritos de imagem pessoal'},
      portions:[p('pack','1 pote (200 g)',200)],
    },
    {
      id:'photo:piracanjuba-proforce-banoffee-250ml',name:'Piracanjuba PRO FORCE Banoffee, 250 ml',category:'Bebidas proteicas',
      aliases:['pro force','proforce','piracanjuba','banoffee','bebida proteica'],preparation:'other',
      note:'Informações mostradas na captura enviada: 250 ml = 170 kcal, 23 g de proteína, 17 g de carboidratos e 1 g de gorduras. Volume não foi convertido em gramas.',
      nutrientsPer100g:{energyKcal:null,proteinG:null,carbsG:null,fatG:null},
      nutrientsPerServing:{energyKcal:170,proteinG:23,carbsG:17,fatG:1},
      source:{name:'Captura enviada pelo usuário',reference:'PRO FORCE Banoffee Piracanjuba, porção 250 ml',license:'Valores transcritos de imagem pessoal'},
      portions:[p('pack','1 unidade (250 ml)',null)],
    },
    {
      id:'growth:whey-unknown',name:'Whey Growth — confirmar linha e sabor',category:'Suplementos',
      aliases:['whey','growth','proteina','suplemento'],preparation:'other',
      note:'Atalho sem macronutrientes. A composição e a dose dependem da versão e do sabor; confira o rótulo.',
      nutrientsPer100g:{energyKcal:null,proteinG:null,carbsG:null,fatG:null},
      source:{name:'Produto informado pelo usuário',reference:'Whey Growth, versão e sabor pendentes',license:'Registro pessoal'},
      portions:[p('dose','1 dose, peso a confirmar',null)],
    },
    {
      id:'ref:generic-169757',name:'Arroz branco cozido (sem óleo)',category:'Refeição',
      aliases:['arroz','arroz branco','rice'],preparation:'cooked',fdc:169757,
      note:'Arroz cozido em água, sem sal e sem óleo. Preparações caseiras podem variar.',
      nutrientsPer100g:{energyKcal:130,proteinG:2.69,carbsG:28.2,fatG:0.28},
      portions:[p('spoon','1 colher de sopa cheia (≈25 g)',25),p('serve','1 colher de servir (≈45 g)',45),p('100g','100 g',100)],
    },
    {
      id:'ref:generic-173735',name:'Feijão-preto cozido (grãos, sem caldo)',category:'Refeição',
      aliases:['feijao','feijão','feijao preto','black beans'],preparation:'cooked',fdc:173735,
      note:'Grãos cozidos sem sal; não representa concha de feijão com caldo, óleo ou temperos.',
      nutrientsPer100g:{energyKcal:132,proteinG:8.86,carbsG:23.71,fatG:0.54},
      portions:[p('spoon','1 colher de sopa de grãos (≈20 g)',20),p('ladle','1 concha de grãos (≈90 g)',90),p('100g','100 g',100)],
    },
    {
      id:'ref:generic-171477',name:'Peito de frango assado, sem pele',category:'Proteínas',
      aliases:['frango','peito de frango','chicken'],preparation:'cooked',fdc:171477,
      note:'Carne assada sem pele. Não contempla óleo adicionado, molho ou empanamento.',
      nutrientsPer100g:{energyKcal:165,proteinG:31,carbsG:0,fatG:3.57},
      portions:[p('small','1 porção menor (≈80 g)',80),p('medium','1 filé médio (≈120 g)',120),p('100g','100 g',100)],
    },
    {
      id:'ref:generic-173424',name:'Ovo cozido',category:'Proteínas',
      aliases:['ovo','ovos','ovo de galinha','egg'],preparation:'cooked',fdc:173424,
      note:'Ovo inteiro cozido, sem gordura acrescentada. Não equivale a ovo frito.',
      nutrientsPer100g:{energyKcal:155,proteinG:12.6,carbsG:1.12,fatG:10.6},
      portions:[p('one','1 ovo grande sem casca (≈50 g)',50),p('100g','100 g',100)],
    },
    {
      id:'ref:generic-173944',name:'Banana crua (polpa)',category:'Frutas',
      aliases:['banana','banana nanica','banana prata','fruit'],preparation:'raw',fdc:173944,
      note:'Referência genérica; espécies e tamanhos vendidos no Brasil podem ter composição diferente.',
      nutrientsPer100g:{energyKcal:89,proteinG:1.09,carbsG:22.8,fatG:0.33},
      portions:[p('small','1 unidade pequena, sem casca (≈80 g)',80),p('medium','1 unidade média, sem casca (≈118 g)',118),p('100g','100 g',100)],
    },
    {
      id:'ref:generic-169705',name:'Aveia em flocos seca',category:'Cereais',
      aliases:['aveia','oats','flocos'],preparation:'raw',fdc:169705,
      note:'Flocos secos; se misturar leite, água ou outros ingredientes, registre separadamente.',
      nutrientsPer100g:{energyKcal:389,proteinG:16.9,carbsG:66.3,fatG:6.9},
      portions:[p('spoon','1 colher de sopa (≈10 g)',10),p('two','2 colheres de sopa (≈20 g)',20),p('100g','100 g',100)],
    },
    {
      id:'ref:generic-171265',name:'Leite integral (referência USDA)',category:'Laticínios',
      aliases:['leite','leite integral','milk'],preparation:'other',fdc:171265,
      note:'Composição de referência de 3,25% de gordura. Prefira o rótulo da marca brasileira quando disponível.',
      nutrientsPer100g:{energyKcal:61,proteinG:3.15,carbsG:4.8,fatG:3.25},
      portions:[p('cup','1 copo (≈200 g, volume não aferido)',200),p('small','1 xícara menor (≈100 g)',100),p('100g','100 g',100)],
    },
  ].map(row=>({...row,source:row.source||source(row.fdc)})).concat(tacoFoods,sweetFoods,growthFoods,drinkFoods);
  if (!N || foods.some(food=>!N.validFood(food))) throw new Error('Catálogo alimentar incompatível.');
  const normalize = value => String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const find = id => foods.find(food=>food.id===id)||null;
  const search = query => {
    const term=normalize(query);
    return foods.filter(food=>normalize([food.name,...food.aliases].join(' ')).includes(term));
  };

  // Display order, not a dietary recommendation or a user-specific consumption log.
  // Branded products already in the offline catalogue appear before generic foods.
  const GROWTH_TOP_IDS=[
    'growth:official:top-natural','growth:official:100-chocolate','growth:official:100-baunilha',
    'growth:official:100-morango','growth:official:isolate-natural','growth:official:hydro-natural',
    'growth:official:3w-chocolate','growth:official:zero-natural','growth:official:medium-natural',
    'growth:official:basic-natural','growth:official:daily-doce-de-leite',
    'growth:official:daily-baunilha','growth:official:daily-zero-chocolate',
    'growth:official:daily-zero-doce-de-leite','growth:official:gourmet-tiramisu',
    'growth:official:sache-natural'];
  const DRINK_SUGGESTIONS=['drink:cafe-coado-sem-acucar','drink:itambe-uht-desnatado','drink:itambe-uht-integral','drink:monster-zero-sugar-473ml','drink:monster-ultra-white-473ml'];
  const mealFirst={
    breakfast:['photo:itambe-zero-morango-200g','photo:piracanjuba-proforce-banoffee-250ml',
      'growth:whey-unknown',...GROWTH_TOP_IDS,'taco:2011:53','taco:2011:140','ref:generic-173424','taco:2011:533','ref:generic-173944','ref:generic-169705','ref:generic-171265',...DRINK_SUGGESTIONS],
    lunch:['ref:generic-169757','taco:2011:561','taco:2011:346','taco:2011:401','taco:2011:93','ref:generic-171477','taco:2011:429','taco:2011:539'],
    snack:['recipe:brigadeiro-caseiro','recipe:brigadeiro-morango','taco:2011:16','photo:itambe-zero-morango-200g','photo:piracanjuba-proforce-banoffee-250ml',
      'growth:whey-unknown',...GROWTH_TOP_IDS,'taco:2011:140','taco:2011:386','ref:generic-173944','ref:generic-169705',
      'local:doce-cascao-acai-trufado-branco-500ml','local:doce-cascao-acai-trufado-preto-500ml',...DRINK_SUGGESTIONS],
    dinner:['ref:generic-169757','taco:2011:561','taco:2011:346','taco:2011:401','taco:2011:93','taco:2011:538','taco:2011:429'],
    supper:['photo:itambe-zero-morango-200g','photo:piracanjuba-proforce-banoffee-250ml',
      'ref:generic-171265',...GROWTH_TOP_IDS,'growth:whey-unknown',...DRINK_SUGGESTIONS]
  };
  function orderedForMeal(mealType){
    const ids=mealFirst[mealType]||mealFirst.breakfast;
    const ranking=new Map(ids.map((id,i)=>[id,i]));
    return foods.slice().sort((a,b)=>(ranking.get(a.id)??999)-(ranking.get(b.id)??999));
  }
  // Copy estimates into each entry so catalogue updates cannot rewrite past records.
  function copyEstimate(estimate, factor=1, digits=1) {
    return {
      confidence:estimate.confidence,servingLabel:estimate.servingLabel,
      assumptions:estimate.assumptions,
      ...Object.fromEntries(['low','central','high'].map(group=>[group,
        Object.fromEntries(N.NUTRIENTS.map(key=>[key,
          Math.round(estimate[group][key]*factor*(10**digits))/(10**digits)]))])),
    };
  }
  function makeItem(foodId,portionId,count,makeId) {
    const food=find(foodId),qty=Number(count);
    if(!food || !Number.isFinite(qty) || qty<=0 || qty>10000 || typeof makeId!=='function')return null;
    const portion=food.portions.find(row=>row.id===portionId);
    if(portionId==='custom' && (food.nutrientsPerServing||food.nutrientsPerMl||(food.estimate&&!food.estimateGramsBase)))return null;
    if(portionId==='customMl'&&!food.nutrientsPerMl)return null;
    if(!['custom','customMl'].includes(portionId)&&!portion)return null;
    const liquid=!!food.nutrientsPerMl;
    const grams=liquid?null:portionId==='custom'?qty:(portion.grams==null?null:Math.round(qty*portion.grams*100)/100);
    const mlPerPortion=liquid?Number(food.portions[0].label.split(' ')[0]):null;
    if(grams!==null && (grams<=0||grams>10000))return null;
    const item={
      id:makeId('item'),foodId:food.id,label:food.name,
      quantity:liquid?(portionId==='customMl'?qty:portionId==='half'?(mlPerPortion/2)*qty:portionId==='100ml'?100*qty:mlPerPortion*qty):portionId==='custom'?grams:qty,
      unit:liquid?'ml':portionId==='custom'?'g':'portion',grams,
      nutrientsPer100g:{...food.nutrientsPer100g},
      ...(liquid?{nutrientsPerMl:{...food.nutrientsPerMl}}:{}),
      ...(food.nutrientsPerServing?{nutrientsPerServing:{...food.nutrientsPerServing}}:{}),
      ...(food.estimate?{estimate:copyEstimate(food.estimate,portionId==='custom'?1/food.estimateGramsBase:(portion?.factor??1),portionId==='custom'?5:1)}:{}),
      source:{...food.source},
    };
    return N.validEntry({id:'validation',date:'2026-11-14',mealType:'other',items:[item]})?item:null;
  }
  function makeFavorite(entry,archive,name,makeId) {
    if(!N.validEntry(entry)||!N.validArchive(archive)||typeof makeId!=='function')return null;
    const built=[],foodsToAdd=[];
    for(const item of entry.items) {
      // Freeze the entry's composition in personal foods, including user corrections.
      let food=find(item.foodId)||archive.foods.find(f=>f.id===item.foodId);
      if(food && (JSON.stringify(food.nutrientsPer100g)!==JSON.stringify(item.nutrientsPer100g)||JSON.stringify(food.source)!==JSON.stringify(item.source)||food.name!==item.label))food=null;
      if(!food) {
        food={
          id:makeId('personal-food'),name:item.label,preparation:'other',
          nutrientsPer100g:{...item.nutrientsPer100g},
          ...(item.nutrientsPerMl?{nutrientsPerMl:{...item.nutrientsPerMl}}:{}),
          ...(item.estimate?{estimate:copyEstimate(item.estimate)}:{}),
          source:item.source?{...item.source}:{name:'Registro pessoal',reference:'Sem composição nutricional verificada',license:'Uso pessoal'},
        };
        if(!N.validFood(food))return null;
        foodsToAdd.push(food);
      }
      built.push({id:makeId('preset'),foodId:food.id,
        quantity:item.quantity,unit:item.unit,grams:item.grams,
        ...(item.nutrientsPerMl?{nutrientsPerMl:{...item.nutrientsPerMl}}:{}),
        ...(item.nutrientsPerServing?{nutrientsPerServing:{...item.nutrientsPerServing}}:{}),
        ...(item.estimate?{estimate:copyEstimate(item.estimate)}:{}),
      });
    }
    const title=(String(name??'').trim()||entry.items.map(item=>item.label).join(' + ')).slice(0,120);
    const favorite={id:makeId('favorite'),name:title,mealType:entry.mealType,items:built};
    return N.validTemplate(favorite)?{favorite,foodsToAdd}:null;
  }
  function fromFavorite(favorite,date,archive,makeId) {
    if(!N.validTemplate(favorite)||!N.validArchive(archive)||!N.dateOk(date)||typeof makeId!=='function')return null;
    const items=favorite.items.map(item=>{
      const food=find(item.foodId)||archive.foods.find(f=>f.id===item.foodId);
      return food?{
        id:makeId('item'),foodId:food.id,label:food.name,
        quantity:item.quantity,unit:item.unit,grams:item.grams,
        nutrientsPer100g:{...food.nutrientsPer100g},
        ...(item.nutrientsPerMl?{nutrientsPerMl:{...item.nutrientsPerMl}}:(food.nutrientsPerMl?{nutrientsPerMl:{...food.nutrientsPerMl}}:{})),
        ...(item.nutrientsPerServing?{nutrientsPerServing:{...item.nutrientsPerServing}}:(food.nutrientsPerServing?{nutrientsPerServing:{...food.nutrientsPerServing}}:{})),
        ...(item.estimate?{estimate:copyEstimate(item.estimate)}:{}),
        source:{...food.source},
      }:null;
    });
    if(items.some(item=>!item))return null;
    const entry={id:makeId('meal'),date,
      mealType:N.MEALS.includes(favorite.mealType)?favorite.mealType:'other',
      time:null,notes:'',items};
    return N.validEntry(entry)?entry:null;
  }
  const api={VERSION:1,foods,find,search,orderedForMeal,makeItem,makeFavorite,fromFavorite};
  root.ForjaNutritionCatalog=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
