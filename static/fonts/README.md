# BLESS banner handwriting

Font: Ma Shan Zheng, by The Ma Shan Zheng Project Authors.
Source: https://github.com/googlefonts/mashanzheng
License: SIL OFL 1.1, see OFL-MaShanZheng.txt.
Downloaded from Google Fonts CSS2 API with a text subset for the fixed simplified/traditional Chinese banner slogan; not a complete Chinese font. Add characters to the subset if the slogan changes.

The supplied reference is too small to identify its exact typeface. This is a stylistically similar brush font, not a claim of matching the original font. Other languages use the readable system font with a gentle italic style. The text remains localized and is not baked into artwork.

H5 loads the bundled static font. Mini-program/App use uni.loadFontFace with the same file served at /static/fonts/bless-handwriting.ttf from the configured backend. Deploy public/fonts too; production requires the backend HTTPS domain in mini-program font download settings. A system typeface is used while loading or if the network fails.
