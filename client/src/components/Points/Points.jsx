import styles from "./Points.module.css";
import cardAssets from "../../cardAssets";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const items = [
  {
    value: "item-1",
    trigger: "Valuation of Points",
    content:
      "The harsh truth is that it is challenging to know the exact value of a point. The best we can do is find the minimum value of a point. Typically this is found through how much a credit card vendor will give per point towards a statement payment.",
    emphasis: "Users should never spend their points below this threshold.",
  },
  {
    value: "item-2",
    trigger: "What is X point worth?",
    content:
      "The value of a point depends entirely on how the user decides to spend it. Card Chart provides users with a rough expected value of a point. However, deals are always changing and new fringe offers are always available. That's why at Card Chart we try to get users the highest amount of points, instead of pretending that we know the dollar value of the promotion. For instance, let's say a user has 50,000 AMEX Points. You could use each point to pay your statement. 1 point is 1 cent. Or you could use 48,000 points for a last second flight from Toronto to Tokyo (values ranging from $500 to $1,800). Making 1 point valued at 3.25 cents. So why not just give users the highest point use case as the valuation? Two reasons. 1. Valuations are always changing. 2. Every user is different. Some people want to fly to Tokyo last minute, most people don't.",
  },
];

const Points = () => {
  return (
    <div className={styles.hero}>
      <div className={styles.headingBlock}>
        <h1 className={styles.title}>Points Guide</h1>
        <h2 className={styles.subTitle}>Everything you need to know.</h2>
      </div>

      <img
        src={cardAssets["amex_platinum"]?.src}
        className={styles.card}
        alt="Amex Platinum"
      />

      <div className={styles.accordionWrap}>
        <Accordion type="single" collapsible className={styles.accordion}>
          {items.map((item) => (
            <AccordionItem key={item.value} value={item.value}>
              <AccordionTrigger>{item.trigger}</AccordionTrigger>
              <AccordionContent>
                <p className={styles.paragraph}>
                  {item.content}
                  {item.emphasis ? (
                    <>
                      {" "}
                      <strong>{item.emphasis}</strong>
                    </>
                  ) : null}
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
};

export default Points;
