# How the Regression tab works

This page explains the math behind the Regression tab, so a student or TA can check its numbers by hand.
Everything here lives in `src/lib/regressionUtils.ts`, and each rule has a matching test in `src/lib/__tests__/regressionUtils.test.ts`.

## The data

Each standard is one well with a known concentration (x) and a measured color value (y) for one color channel, such as Red or Green.
Each color channel gets its own curve.
Points you exclude are left out of every step below.
They stay on the chart as hollow grey circles, so you can see them and include them again.

The error bars on the Red, Green and Blue charts show how much the color varies from pixel to pixel inside that one well.
They are a measure of how even the well looks, not of how well the curve fits.

## The four curve shapes

| Curve | Equation | Numbers it fits (p) |
|---|---|---|
| Linear | y = m x + b | 2 |
| Quadratic | y = a x² + b x + c | 3 |
| Power | y = a x^b | 2 |
| Logarithmic | y = a ln(x) + b | 2 |

Each curve is fitted by least squares: it is the curve that makes the sum of the squared up-and-down distances from the standards to the curve as small as possible.
The power curve is fitted as a straight line through ln(y) against ln(x), which is the usual shortcut, and its R² is then measured in the original units.

A power or log curve has no value at zero concentration, because ln(0) does not exist.
So a blank standard (x = 0) is left out of those two curves: out of the fit, out of R², out of the scatter and out of the outlier check.
Their line on the chart is not drawn at zero.

## R² and how "Best" picks a curve

R² compares how far the standards sit from the curve with how far they sit from their own average:

    R² = 1 - (sum of squared distances to the curve) / (sum of squared distances to the average y)

R² = 1 means every standard sits exactly on the curve.

Plain R² cannot be used to choose between curves, because a curve with more numbers in it always fits at least as well.
A quadratic can always bend to match a straight line, and with only three standards it passes through all of them exactly.
So "Best" uses adjusted R², which takes off a little for every extra number in the equation:

    adjusted R² = 1 - (1 - R²) × (n - 1) / (n - p)

Here n is the number of standards used and p is from the table above.

Worked example with 5 standards:

| Curve | R² | adjusted R² |
|---|---|---|
| Linear (p = 2) | 0.990 | 1 - 0.010 × 4 / 3 = 0.987 |
| Quadratic (p = 3) | 0.992 | 1 - 0.008 × 4 / 2 = 0.984 |

The quadratic has the higher R², but the straight line wins, because the bend did not buy enough.

Rules for which curves take part:

- Linear always takes part.
- Logarithmic and power only take part when every standard is above zero concentration (power also needs every color value above zero), so all curves are scored on the same points.
- Quadratic only takes part with 4 or more standards.
- On a tie, the simpler curve wins, in the order linear, logarithmic, power, quadratic.

## Predicting an unknown

For an unknown well, the tab takes its color value y and solves the curve's equation for x.

| Curve | Solved for x |
|---|---|
| Linear | x = (y - b) / m |
| Quadratic | the root of a x² + b x + (c - y) = 0 described below |
| Power | x = (y / a)^(1/b) |
| Logarithmic | x = e^((y - b) / a) |

A quadratic usually has two answers.
The tab uses the one inside the range of your standards' concentrations.
If neither answer is inside that range, it uses the one closest to it.
If both are inside, it uses the larger one, though a curve that turns back on itself within your standards is a sign to pick a different curve.

If the equation has no answer, for example a flat line or a color the curve never reaches, the prediction is left blank in the table and in the exported file.

## The ± next to a prediction

First, the typical scatter of the standards around the curve, in color units (the residual standard error, RSE):

    RSE = square root of ( sum of squared distances to the curve / (n - p) )

Dividing by n - p instead of n allows for the fact that the curve was fitted to those same points.

The scatter is then turned into concentration units using how steep the curve is at the predicted concentration:

    ± = RSE / |slope of the curve at x|

| Curve | Slope at x |
|---|---|
| Linear | m |
| Quadratic | 2 a x + b |
| Power | a b x^(b - 1) |
| Logarithmic | a / x |

Example: if the standards scatter by RSE = 2.0 color units and the line rises 40 color units per mM, the ± is 2.0 / 40 = 0.05 mM.
A steep curve gives a small ±, because a big change in color means only a small change in concentration.
A curve that flattens out gives a large ±, which is a sign that the method is losing sensitivity there.

This ± is a quick estimate of the scatter only.
It leaves out the uncertainty in the curve itself and in the unknown's own reading, so the real uncertainty is somewhat larger, most of all for unknowns near the ends of the standards' range or outside it.

## Outliers

For each standard:

    residual = measured color - color the curve predicts
    standardized residual = residual / RSE

A standard is flagged as a possible outlier when its standardized residual is above 2 or below -2, meaning it sits more than twice the typical scatter away from the curve.
The residual plot, the warning in the sample table and the Outliers button all use this same rule.
The Outliers button excludes every flagged standard in one click.

Use judgment with this rule.
With only 4 or 5 standards, one bad point pulls the curve toward itself and may not get flagged.
Even when nothing went wrong, each standard has roughly a 1 in 20 chance of landing past 2, so with many standards a good point will now and then be flagged.
Checking the well on the photo is always worth doing before excluding it.
