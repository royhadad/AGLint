import { CssInjectionBodyParser, ICssRuleBody } from "../../../../src/parser/cosmetic/body/css";
import { AdblockSyntax } from "../../../../src/utils/adblockers";
import { CssTree } from "../../../../src/utils/csstree";

describe("CssInjectionBodyParser", () => {
    test("isUblockCssInjection", () => {
        expect(CssInjectionBodyParser.isUblockCssInjection("")).toBe(false);
        expect(CssInjectionBodyParser.isUblockCssInjection(" ")).toBe(false);

        expect(CssInjectionBodyParser.isUblockCssInjection(".ad")).toBe(false);

        expect(CssInjectionBodyParser.isUblockCssInjection("body {}")).toBe(false);

        expect(
            CssInjectionBodyParser.isUblockCssInjection("body { padding-top: 0 !important; }")
        ).toBe(false);

        expect(
            CssInjectionBodyParser.isUblockCssInjection(
                "@media (min-width: 1024px) { body { padding-top: 0 !important; } }"
            )
        ).toBe(false);

        // Empty
        expect(CssInjectionBodyParser.isUblockCssInjection("body:style()")).toBe(false);

        expect(
            CssInjectionBodyParser.isUblockCssInjection("body:style(padding-top: 0 !important;)")
        ).toBe(true);

        expect(CssInjectionBodyParser.isUblockCssInjection("body:ad-component:remove()")).toBe(
            true
        );
    });

    test("isAdGuardCssInjection", () => {
        expect(CssInjectionBodyParser.isAdGuardCssInjection("")).toBe(false);
        expect(CssInjectionBodyParser.isAdGuardCssInjection(" ")).toBe(false);

        expect(CssInjectionBodyParser.isAdGuardCssInjection(".ad")).toBe(false);

        // Empty
        expect(CssInjectionBodyParser.isAdGuardCssInjection("body {}")).toBe(false);

        expect(
            CssInjectionBodyParser.isAdGuardCssInjection("body { padding-top: 0 !important; }")
        ).toBe(true);

        expect(
            CssInjectionBodyParser.isAdGuardCssInjection(
                "@media (min-width: 1024px) { body { padding-top: 0 !important; } }"
            )
        ).toBe(true);

        expect(CssInjectionBodyParser.isAdGuardCssInjection("body:style()")).toBe(false);

        expect(
            CssInjectionBodyParser.isAdGuardCssInjection("body:style(padding-top: 0 !important;)")
        ).toBe(false);

        expect(CssInjectionBodyParser.isAdGuardCssInjection("body:ad-component:remove()")).toBe(
            false
        );
    });

    test("parseAdGuardCssInjection", () => {
        expect(
            CssInjectionBodyParser.parseAdGuardCssInjection("body { padding-top: 0 !important; }")
        ).toEqual(<ICssRuleBody>{
            selectors: [CssTree.parse("body", "selector")],
            block: CssTree.parse("{ padding-top: 0 !important; }", "block"),
        });

        expect(
            CssInjectionBodyParser.parseAdGuardCssInjection(
                "body, section:has(.something) { padding-top: 0 !important; padding-bottom: 0 !important; color: red !important; }"
            )
        ).toEqual(<ICssRuleBody>{
            selectors: [
                CssTree.parse("body", "selector"),
                CssTree.parse("section:has(.something)", "selector"),
            ],
            block: CssTree.parse(
                "{ padding-top: 0 !important; padding-bottom: 0 !important; color: red !important; }",
                "block"
            ),
        });

        // Complicated case: Media query, ExtCss selector
        expect(
            CssInjectionBodyParser.parseAdGuardCssInjection(
                "@media (min-width: 1000px) and (max-width: 2000px) { body, section:has(.something) { padding-top: 0 !important; padding-bottom: 0 !important; color: red !important; } }"
            )
        ).toEqual(<ICssRuleBody>{
            mediaQueryList: CssTree.parse(
                "(min-width: 1000px) and (max-width: 2000px)",
                "mediaQueryList"
            ),
            selectors: [
                CssTree.parse("body", "selector"),
                CssTree.parse("section:has(.something)", "selector"),
            ],
            block: CssTree.parse(
                "{ padding-top: 0 !important; padding-bottom: 0 !important; color: red !important; }",
                "block"
            ),
        });

        // Remove
        expect(
            CssInjectionBodyParser.parseAdGuardCssInjection(
                "body > section[ad-source] { remove: true; }"
            )
        ).toEqual(<ICssRuleBody>{
            selectors: [CssTree.parse("body > section[ad-source]", "selector")],
            block: "remove",
        });

        // Invalid cases
        expect(() =>
            CssInjectionBodyParser.parseAdGuardCssInjection(
                "body > section[ad-source] { remove: true; remove: true; }"
            )
        ).toThrowError(/^Multiple remove property found in the following CSS injection body:/);

        expect(() =>
            CssInjectionBodyParser.parseAdGuardCssInjection(
                "body > section[ad-source] { remove: true; padding: 0; }"
            )
        ).toThrowError(
            /^In addition to the remove property, the following CSS injection body also uses other properties:/
        );

        expect(() =>
            CssInjectionBodyParser.parseAdGuardCssInjection(
                "body > section[ad-source] { padding: 0; remove: true; }"
            )
        ).toThrowError(
            /^In addition to the remove property, the following CSS injection body also uses other properties:/
        );

        expect(() =>
            CssInjectionBodyParser.parseAdGuardCssInjection(
                "body > section[ad-source] { margin: 0; remove: true; padding: 0; }"
            )
        ).toThrowError(
            /^In addition to the remove property, the following CSS injection body also uses other properties:/
        );

        expect(() =>
            CssInjectionBodyParser.parseAdGuardCssInjection("body > section[ad-source] { asd }")
        ).toThrowError();
    });

    test("parseUblockCssInjection", () => {
        expect(
            CssInjectionBodyParser.parseUblockCssInjection("body:style(padding-top: 0 !important;)")
        ).toEqual(<ICssRuleBody>{
            selectors: [CssTree.parse("body", "selector")],
            block: CssTree.parse("{ padding-top: 0 !important; }", "block"),
        });

        expect(
            CssInjectionBodyParser.parseUblockCssInjection(
                "body, section:has(.something):style(padding-top: 0 !important; padding-bottom: 0 !important; color: red !important;)"
            )
        ).toEqual(<ICssRuleBody>{
            selectors: [
                CssTree.parse("body", "selector"),
                CssTree.parse("section:has(.something)", "selector"),
            ],
            block: CssTree.parse(
                "{ padding-top: 0 !important; padding-bottom: 0 !important; color: red !important; }",
                "block"
            ),
        });

        // Remove
        expect(
            CssInjectionBodyParser.parseUblockCssInjection("body > section[ad-source]:remove()")
        ).toEqual(<ICssRuleBody>{
            selectors: [CssTree.parse("body > section[ad-source]", "selector")],
            block: "remove",
        });

        // Invalid
        expect(CssInjectionBodyParser.parseUblockCssInjection("body { padding: 0; }")).toBe(null);
    });

    test("parse", () => {
        expect(
            CssInjectionBodyParser.parse(
                "body, section:has(.something):style(padding-top: 0 !important; padding-bottom: 0 !important; color: red !important;)"
            )
        ).toEqual(<ICssRuleBody>{
            selectors: [
                CssTree.parse("body", "selector"),
                CssTree.parse("section:has(.something)", "selector"),
            ],
            block: CssTree.parse(
                "{ padding-top: 0 !important; padding-bottom: 0 !important; color: red !important; }",
                "block"
            ),
        });

        expect(CssInjectionBodyParser.parse("body, section:has(.something):remove()")).toEqual(<
            ICssRuleBody
        >{
            selectors: [
                CssTree.parse("body", "selector"),
                CssTree.parse("section:has(.something)", "selector"),
            ],
            block: "remove",
        });

        expect(
            CssInjectionBodyParser.parse(
                "@media (min-width: 1000px) and (max-width: 2000px) { body, section:has(.something) { padding-top: 0 !important; padding-bottom: 0 !important; color: red !important; } }"
            )
        ).toEqual(<ICssRuleBody>{
            mediaQueryList: CssTree.parse(
                "(min-width: 1000px) and (max-width: 2000px)",
                "mediaQueryList"
            ),
            selectors: [
                CssTree.parse("body", "selector"),
                CssTree.parse("section:has(.something)", "selector"),
            ],
            block: CssTree.parse(
                "{ padding-top: 0 !important; padding-bottom: 0 !important; color: red !important; }",
                "block"
            ),
        });

        expect(
            CssInjectionBodyParser.parse(
                "@media (min-width: 1000px) and (max-width: 2000px) { body, section:has(.something) { remove: true; } }"
            )
        ).toEqual(<ICssRuleBody>{
            mediaQueryList: CssTree.parse(
                "(min-width: 1000px) and (max-width: 2000px)",
                "mediaQueryList"
            ),
            selectors: [
                CssTree.parse("body", "selector"),
                CssTree.parse("section:has(.something)", "selector"),
            ],
            block: "remove",
        });
    });

    test("generate", () => {
        const parseAndGenerate = (raw: string, syntax: AdblockSyntax) => {
            const ast = CssInjectionBodyParser.parse(raw);

            if (ast) {
                return CssInjectionBodyParser.generate(ast, syntax);
            }

            return null;
        };

        expect(parseAndGenerate("body { padding: 0!important; }", AdblockSyntax.AdGuard)).toEqual(
            "body { padding: 0 !important; }"
        );

        expect(
            parseAndGenerate(
                "@media (min-width: 1000px) and (max-width: 2000px) { body, section:has(.something) { remove: true; } }",
                AdblockSyntax.AdGuard
            )
        ).toEqual(
            "@media (min-width:1000px) and (max-width:2000px) { body, section:has(.something) { remove: true; } }"
        );
    });
});
