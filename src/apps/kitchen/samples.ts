import { uuid } from '../../lib/uuid'
import type { Recipe } from './types'
import { emptyRecipe } from './types'

type I = [key: string, amount: string, name: string]
type S = [text: string, action: string, minutes: number | null, uses: string[]]

function recipe(base: Partial<Recipe> & { title: string }, ing: I[], steps: S[]): Recipe {
  const ids = Object.fromEntries(ing.map(([k]) => [k, uuid()]))
  return {
    ...emptyRecipe(), ...base, id: uuid(), created_at: new Date().toISOString(),
    ingredients: ing.map(([k, amount, name]) => ({ id: ids[k], amount, name })),
    steps: steps.map(([text, action, minutes, uses]) => ({ id: uuid(), text, action, minutes, uses: uses.map(k => ids[k]) })),
  }
}

/** A few recipes to show how the app works. Offered on an empty cookbook, and used in demo mode. */
export function sampleRecipes(): Recipe[] {
  return [
    recipe({ title: 'Banana bread', emoji: '🍌', servings: 10, tags: ['Baking', 'Sweet'], favourite: true, notes: 'Keeps for 4 days wrapped in foil. Even better toasted with butter.' }, [
      ['ban', '3', 'very ripe bananas'],
      ['but', '75 g', 'butter, melted'],
      ['sug', '150 g', 'light brown sugar'],
      ['egg', '1', 'egg'],
      ['van', '1 tsp', 'vanilla extract'],
      ['soda', '1 tsp', 'bicarbonate of soda'],
      ['salt', '1 pinch', 'salt'],
      ['flour', '190 g', 'plain flour'],
    ], [
      ['Preheat the oven to 180°C (160°C fan) and line a 900 g loaf tin with baking paper.', 'Preheat oven 180°C', 10, []],
      ['Mash the bananas in a large bowl with a fork until smooth.', 'Mash', 3, ['ban']],
      ['Stir in the melted butter.', 'Stir in', 1, ['but']],
      ['Mix in the sugar, egg and vanilla.', 'Mix in', 2, ['sug', 'egg', 'van']],
      ['Sprinkle over the bicarbonate of soda and salt, then fold in the flour until just combined. Don’t overmix.', 'Fold in gently', 2, ['soda', 'salt', 'flour']],
      ['Pour into the tin and bake for 55–60 minutes, until a skewer comes out clean.', 'Bake', 60, ['ban']],
      ['Cool in the tin for 10 minutes, then turn out onto a rack.', 'Cool', 10, ['ban']],
    ]),
    recipe({ title: 'Spaghetti carbonara', emoji: '🍝', servings: 2, tags: ['Pasta', 'Quick'], source: 'Roman style: no cream' }, [
      ['pasta', '200 g', 'spaghetti'],
      ['guan', '100 g', 'guanciale or pancetta'],
      ['yolk', '3', 'egg yolks'],
      ['egg', '1', 'whole egg'],
      ['pec', '50 g', 'pecorino romano, finely grated'],
      ['pep', '1 tsp', 'black pepper, freshly ground'],
      ['salt', '', 'salt for the pasta water'],
    ], [
      ['Bring a large pot of water to the boil and salt it well.', 'Boil water', 8, ['salt']],
      ['Cut the guanciale into strips and fry in a dry pan over medium heat until crisp, about 6 minutes. Take off the heat.', 'Fry until crisp', 6, ['guan']],
      ['Whisk the yolks, whole egg, most of the pecorino and the pepper in a bowl.', 'Whisk', 2, ['yolk', 'egg', 'pec', 'pep']],
      ['Cook the spaghetti until al dente, about 9 minutes. Save a mug of pasta water before draining.', 'Cook al dente', 9, ['salt', 'pasta']],
      ['Toss the pasta in the pan with the guanciale, then off the heat stir in the egg mix with a splash of pasta water until glossy.', 'Toss off the heat', 2, ['pasta', 'guan', 'yolk']],
      ['Serve straight away with the rest of the pecorino and more pepper.', 'Serve', null, ['pasta']],
    ]),
    recipe({ title: 'Shakshuka', emoji: '🍳', servings: 2, tags: ['Breakfast', 'Vegetarian'] }, [
      ['oil', '2 tbsp', 'olive oil'],
      ['onion', '1', 'onion, sliced'],
      ['pep', '1', 'red pepper, sliced'],
      ['gar', '2 cloves', 'garlic, sliced'],
      ['spice', '1 tsp', 'cumin and 1 tsp smoked paprika'],
      ['tom', '1 can', 'chopped tomatoes (400 g)'],
      ['eggs', '4', 'eggs'],
      ['herb', '1 handful', 'coriander or parsley'],
    ], [
      ['Heat the oil in a wide pan and soften the onion and pepper for 8 minutes.', 'Soften', 8, ['oil', 'onion', 'pep']],
      ['Add the garlic and spices and cook for 1 minute until fragrant.', 'Add, 1 min', 1, ['gar', 'spice', 'onion']],
      ['Tip in the tomatoes, season and simmer for 10 minutes until thick.', 'Simmer until thick', 10, ['tom', 'onion']],
      ['Make 4 dips in the sauce and crack an egg into each. Cover and cook for 6–8 minutes until the whites are set.', 'Add eggs, cover', 8, ['eggs', 'onion']],
      ['Scatter over the herbs and serve with bread.', 'Scatter, serve', null, ['herb', 'onion']],
    ]),
  ]
}
