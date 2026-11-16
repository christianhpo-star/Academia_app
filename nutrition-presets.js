/* Optional meal suggestions. Food combinations are generic; no personal clinical targets or identities live in source. */
(function installMealPresets(root) {
  'use strict';
  const N = root.ForjaNutrition || (typeof require === 'function' ? require('./nutrition.js') : null);
  const CAT = root.ForjaNutritionCatalog || (typeof require === 'function' ? require('./nutrition-catalog.js') : null);
  const g = (foodId, grams, label) => ({foodId, portionId:'custom', count:grams, label, amount:grams+' g'});
  const ml = (foodId, amount, label) => ({foodId, portionId:'customMl', count:amount, label, amount:amount+' ml'});
  const unit = (foodId, portionId, label, amount) => ({foodId, portionId, count:1, label, amount});
  const pending = (label, quantity, unitName='g', amount) =>
    ({label, count:quantity, unit:unitName, amount:amount || quantity+' '+unitName, unknown:true});
  const wheat = 'taco:2011:52', french = 'taco:2011:53';
  const egg = 'ref:generic-173424', banana = 'taco:2011:182';
  const oats = 'ref:generic-169705', whey = 'growth:official:isolate-natural';
  const skim = 'drink:itambe-uht-desnatado', chicken = 'taco:2011:410';
  const rice = 'ref:generic-169757', beans = 'taco:2011:561';
  const veg = 'taco:2011:546';
  const recipes = [
    {id:'breakfast-shake',mealType:'breakfast',title:'Vitamina com whey',
      ingredients:[ml(skim,200,'Leite desnatado'),g(whey,30,'Whey isolado Growth'),g(oats,20,'Aveia'),g(banana,80,'Banana')]},
    {id:'breakfast-eggs',mealType:'breakfast',title:'Pão, ovos e fruta',
      ingredients:[g(french,50,'Pão francês'),g(egg,100,'Ovos cozidos (aprox. 2)'),g('taco:2011:463',30,'Muçarela'),g(banana,80,'Banana')]},
    {id:'breakfast-yogurt',mealType:'breakfast',title:'Iogurte, fruta, aveia e whey',
      ingredients:[pending('Iogurte natural desnatado',170),g(banana,80,'Banana'),g(oats,20,'Aveia'),g(whey,15,'Whey isolado Growth')]},
    {id:'breakfast-pancake',mealType:'breakfast',title:'Panqueca de banana',
      ingredients:[g(banana,80,'Banana'),g(egg,50,'Ovo'),g(oats,15,'Aveia'),pending('Cacau em pó',1,'spoon','1 colher de sopa')]},
    {id:'breakfast-porridge',mealType:'breakfast',title:'Mingau de aveia',
      ingredients:[g(oats,50,'Aveia'),ml(skim,150,'Leite desnatado')]},
    {id:'lunch-chicken',mealType:'lunch',title:'Arroz, feijão e frango',
      ingredients:[g(rice,120,'Arroz'),g(beans,80,'Feijão'),g(chicken,150,'Frango grelhado'),g(veg,100,'Legumes (quantidade ajustável)')]},
    {id:'lunch-beef',mealType:'lunch',title:'Arroz, feijão e patinho',
      ingredients:[g(rice,120,'Arroz'),g(beans,80,'Feijão'),g('taco:2011:377',120,'Patinho grelhado'),g(veg,100,'Legumes (quantidade ajustável)')]},
    {id:'lunch-sandwich',mealType:'lunch',title:'Sanduíche com frango',
      ingredients:[g(wheat,50,'Pão integral (2 fatias)'),g(chicken,70,'Frango'),g('taco:2011:463',30,'Muçarela'),g('taco:2011:78',40,'Salada'),g('taco:2011:214',180,'Laranja')]},
    {id:'snack-yogurt',mealType:'snack',title:'Iogurte proteico com fruta',
      ingredients:[pending('Iogurte natural desnatado',170),g(whey,30,'Whey isolado Growth'),g('taco:2011:239',190,'Morangos (aprox. 8)'),pending('Chia',15)]},
    {id:'snack-sandwich',mealType:'snack',title:'Sanduíche de frango',
      ingredients:[g(wheat,50,'Pão integral (2 fatias)'),g(chicken,40,'Frango desfiado')]},
    {id:'snack-ready',mealType:'snack',title:'Bebida proteica e fruta',
      ingredients:[unit('photo:piracanjuba-proforce-banoffee-250ml','pack','Bebida proteica Piracanjuba','250 ml'),g(banana,80,'Banana')]},
    {id:'dinner-bowl',mealType:'dinner',title:'Prato com frango e legumes',
      ingredients:[g(rice,120,'Arroz'),g(beans,80,'Feijão'),g(chicken,150,'Frango'),g(veg,100,'Legumes cozidos (ajustável)')]},
    {id:'dinner-wrap',mealType:'dinner',title:'Wrap com frango',
      ingredients:[pending('Rap10 ou wrap',2,'unit','2 unidades'),g(chicken,100,'Frango'),g('taco:2011:463',30,'Muçarela')]},
    {id:'dinner-shake',mealType:'dinner',title:'Vitamina de whey e fruta',
      ingredients:[ml(skim,200,'Leite desnatado (ou água)'),g(whey,30,'Whey isolado Growth'),g(banana,80,'Banana')]},
  ];
  const forMeal = mealType => recipes.filter(recipe => recipe.mealType === mealType);
  const find = id => recipes.find(recipe => recipe.id === id) || null;
  const hasMissing = recipe => recipe.ingredients.some(ingredient => ingredient.unknown);
  function makeEntry(recipeId, day, makeId) {
    const recipe = find(recipeId);
    if (!recipe || !N || !CAT || !N.dateOk(day) || typeof makeId !== 'function') return null;
    const items = recipe.ingredients.map(ingredient => {
      if (ingredient.unknown) return {
        id:makeId('item'),label:ingredient.label,quantity:ingredient.count,
        unit:ingredient.unit,grams:ingredient.unit==='g'?ingredient.count:null,
        nutrientsPer100g:{energyKcal:null,proteinG:null,carbsG:null,fatG:null,fiberG:null},
        source:null,
      };
      return CAT.makeItem(ingredient.foodId, ingredient.portionId, ingredient.count, makeId);
    });
    if (items.some(item => !item)) return null;
    const entry = {id:makeId('meal'),date:day,mealType:recipe.mealType,time:null,
      notes:'Opção do plano: '+recipe.title,items};
    return N.validEntry(entry) ? entry : null;
  }
  const api={VERSION:1,recipes,forMeal,find,hasMissing,makeEntry};
  root.ForjaMealPresets=api;
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
})(typeof window !== 'undefined' ? window : globalThis);
