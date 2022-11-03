/* eslint-disable max-len */
import { Block, Selector } from "css-tree";
import { CssTree } from "../../src/utils/csstree";

describe("CSSTree utils", () => {
    test("getSelectorExtendedCssNodes", () => {
        expect(CssTree.getSelectorExtendedCssNodes(<Selector>CssTree.parse("#test", "selector"))).toEqual({
            attributes: [],
            pseudos: [],
        });

        expect(
            CssTree.getSelectorExtendedCssNodes(<Selector>CssTree.parse(`#test[-ext-contains="something"]`, "selector"))
        ).toMatchObject({
            attributes: [CssTree.createAttributeSelector("-ext-contains", "something")],
            pseudos: [],
        });

        // instead of createAttributeSelector:

        // .toMatchObject({
        //     attributes: [
        //         {
        //             type: "AttributeSelector",
        //             name: {
        //                 type: "Identifier",
        //                 name: "-ext-contains",
        //             },
        //             matcher: "=",
        //             value: {
        //                 type: "String",
        //                 value: "something",
        //             },
        //         },
        //     ],
        //     pseudos: [],
        // });

        expect(
            CssTree.getSelectorExtendedCssNodes(
                <Selector>(
                    CssTree.parse(
                        `#test[-ext-contains="something"]:-abp-has(.ad):if-not([ad]):not([some])::before`,
                        "selector"
                    )
                )
            )
        ).toMatchObject({
            attributes: [CssTree.createAttributeSelector("-ext-contains", "something")],
            // Partial match, for important parts
            pseudos: [
                {
                    name: "-abp-has",
                    type: "PseudoClassSelector",
                },
                {
                    name: "if-not",
                    type: "PseudoClassSelector",
                },
            ],
        });
    });

    // Customized selector generation
    test("generateSelector", () => {
        const parseAndGenerate = (rawSelector: string) => {
            return CssTree.generateSelector(<Selector>CssTree.parse(rawSelector, "selector"));
        };

        expect(parseAndGenerate("#test")).toEqual("#test");
        expect(parseAndGenerate(".test")).toEqual(".test");
        expect(parseAndGenerate("div")).toEqual("div");
        expect(parseAndGenerate("div.test")).toEqual("div.test");
        expect(parseAndGenerate("div#test")).toEqual("div#test");
        expect(parseAndGenerate("div[data-advert]")).toEqual("div[data-advert]");

        expect(
            parseAndGenerate(
                'div[data-advert] > #test ~ div[class="advert"][id="something"]:nth-child(3n+0):first-child'
            )
        ).toEqual(`div[data-advert] > #test ~ div[class="advert"][id="something"]:nth-child(3n+0):first-child`);

        expect(parseAndGenerate(":not(:not([name]))")).toEqual(`:not(:not([name]))`);

        // "Sub selector lists"
        expect(parseAndGenerate(":not(:not([name]):contains(2))")).toEqual(`:not(:not([name]):contains(2))`);

        expect(
            parseAndGenerate(
                `.teasers > div[class=" display"]:has(> div[class] > div[class] > div:not([class]):not([id]) > div:not([class]):not([id]):contains(/^REKLAMA$/))`
            )
        ).toEqual(
            `.teasers > div[class=" display"]:has(> div[class] > div[class] > div:not([class]):not([id]) > div:not([class]):not([id]):contains(/^REKLAMA$/))`
        );
    });

    test("generateBlock", () => {
        const parseAndGenerate = (rawBlock: string) => {
            // Automatically put {}
            return CssTree.generateBlock(<Block>CssTree.parse(`{${rawBlock}}`, "block"));
        };

        expect(parseAndGenerate("padding: 0;")).toEqual("padding: 0;");
        expect(parseAndGenerate("padding: 0")).toEqual("padding: 0;");
        expect(parseAndGenerate("padding: 0!important")).toEqual("padding: 0 !important;");
        expect(parseAndGenerate("padding: 0 !important")).toEqual("padding: 0 !important;");
        expect(parseAndGenerate("padding: 0!important;")).toEqual("padding: 0 !important;");
        expect(parseAndGenerate("padding: 0 !important;")).toEqual("padding: 0 !important;");
        expect(parseAndGenerate("padding: 0!important; margin: 2px")).toEqual("padding: 0 !important; margin: 2px;");
    });
});
