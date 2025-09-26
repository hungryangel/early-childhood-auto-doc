import * as React from "react"
import Link from "next/link"
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu"

const menus = [
  { title: "우리반 관리", href: "/our-class" },
  { title: "활동계획", href: "/activity-plan" },
  { title: "보육일지", href: "/childcare-log" },
  { title: "관찰일지", href: "/observation-log" },
  { title: "발달평가서", href: "/development-evaluation" },
]

export default function Navigation() {
  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4">
        <NavigationMenu className="mx-auto hidden md:flex max-w-max">
          <NavigationMenuList>
            {menus.map((menu) => (
              <NavigationMenuItem key={menu.title}>
                <Link href={menu.href} legacyBehavior passHref>
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                    {menu.title}
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </div>
  )
}