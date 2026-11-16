/* Prescription quick check-in derives every meal and alternative from the reviewed JSON.
   The JSON has no identifying patient details; food catalogue sources are separate. */
(function installMealPresets(root) {
  'use strict';
  const N = root.ForjaNutrition || (typeof require === 'function' ? require('./nutrition.js') : null);
  const CAT = root.ForjaNutritionCatalog || (typeof require === 'function' ? require('./nutrition-catalog.js') : null);
  const DATA = root.ForjaPrescription || (typeof require === 'function' ? require('./nutrition-prescription-data.js') : null);
  const recipes = Object.entries(DATA?.meals || {}).flatMap(([mealType,options]) =>
    options.map(option => ({
      id:option.id,mealType,title:option.label,page:option.page,groups:option.groups,
      notes:option.notes||[],
      ingredients:option.groups.map(group=>({
        ...group.choices[0],label:group.choices[0].name,
        amount:(group.choices[0].qty==null?'Quantidade a informar':group.choices[0].qty+' '+group.choices[0].unit),
        unknown:!group.choices[0].foodId,
      })).filter(i=>i.qty!==0),
    }))
  );
  const forMeal = mealType => recipes.filter(recipe => recipe.mealType === mealType);
  const find = id => recipes.find(recipe => recipe.id === id) || null;
  const choicesFor = (recipe, selections=[]) => recipe.groups.map((group,i)=>group.choices[Number(selections[i]??0)]||group.choices[0]);
  const withQuantities=(recipe,selections=[],quantities=[])=>choicesFor(recipe,selections).map((item,i)=>{
    const raw=quantities[i];if(raw===undefined||raw===null||String(raw).trim()==='')return {...item};
    const qty=Number(String(raw).replace(',','.'));
    return {...item,qty:Number.isFinite(qty)?qty:null};
  });
  const needsQuantity = (recipe,selections=[],quantities=[]) => withQuantities(recipe,selections,quantities).some(choice => choice.qty==null);
  const hasMissing = (recipe,selections=[]) => choicesFor(recipe,selections).some(choice=>choice.qty==null || (!choice.foodId && choice.qty!==0));
  function snapshot(choice,makeId){
    if(choice.qty===0)return null;
    const amount=Number(choice.qty);
    if(!Number.isFinite(amount)||amount<=0 || amount>10000)return undefined;
    if(choice.foodId && CAT && (choice.unit==='g'||choice.unit==='ml')){
      const actual=CAT.makeItem(choice.foodId,choice.unit==='ml'?'customMl':'custom',amount,makeId);
      if(actual){
        // Store the selected label, never substitute a different preparation silently.
        // Equivalent mass labels are recorded as catalogue references, not official food prescriptions.
        actual.label=choice.name;
        return actual;
      }
    }
    const unit=['g','ml','unit','spoon','ladle','portion'].includes(choice.unit)?choice.unit:'portion';
    return {id:makeId('item'),foodId:null,label:choice.name,
      quantity:amount,unit,grams:unit==='g'?amount:null,
      nutrientsPer100g:{energyKcal:null,proteinG:null,carbsG:null,fatG:null,fiberG:null},
      source:null};
  }
  function makeEntry(recipeId,day,makeId,selections=[],quantities=[]) {
    const recipe=find(recipeId);
    if(!recipe||!N||!N.dateOk(day)||typeof makeId!=='function'||needsQuantity(recipe,selections,quantities))return null;
    const items=withQuantities(recipe,selections,quantities).map(choice=>snapshot(choice,makeId)).filter(item=>item!==null);
    if(!items.length || items.some(i=>i===undefined))return null;
    const entry={id:makeId('meal'),date:day,mealType:recipe.mealType,time:null,
      notes:'Opção da prescrição: '+recipe.title,items};
    return N.validEntry(entry)?entry:null;
  }
  const api={VERSION:2,recipes,forMeal,find,choicesFor,withQuantities,needsQuantity,hasMissing,makeEntry,data:DATA};
  root.ForjaMealPresets=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
