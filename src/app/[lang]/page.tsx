import { notFound } from "next/navigation";

import { PersonJsonLd } from "@/components/primitives/PersonJsonLd";
import { About } from "@/components/sections/About";
import { Contact } from "@/components/sections/Contact";
import { Hero } from "@/components/sections/Hero";
import { Projects } from "@/components/sections/Projects";
import { Stack } from "@/components/sections/Stack";
import { Testimonials } from "@/components/sections/Testimonials";
import { Trajectory } from "@/components/sections/Trajectory";
import { getDictionary, isLocale } from "@/content/dictionaries";

export default async function Page({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <>
      <PersonJsonLd lang={lang} dict={dict} />
      <Hero lang={lang} dict={dict} />
      <About dict={dict} />
      <Stack dict={dict} />
      <Trajectory dict={dict} />
      <Projects dict={dict} />
      <Testimonials dict={dict} />
      <Contact lang={lang} dict={dict} />
    </>
  );
}
