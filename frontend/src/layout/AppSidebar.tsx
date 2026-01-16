import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  UserCircle,
  ListTodo,
  Table,
  FileText,
  PieChart,
  Boxes,
  Plug,
  ChevronDown,
  MoreHorizontal,
} from "lucide-react";
import { useSidebar } from "../context/SidebarContext";
import SidebarWidget from "./SidebarWidget";

// Fuerza Tailwind a generar clases críticas de TailAdmin (temporal, puedes quitar después de confirmar)
const ForceTailwindClasses = () => (
  <div className="hidden bg-boxdark dark:bg-boxdark-2 border-strokedark text-meta-4 shadow-default shadow-card bg-meta-4/10 dark:text-gray-300" />
);

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const navItems: NavItem[] = [
  {
    icon: <LayoutDashboard className="w-5 h-5" />,
    name: "Dashboard",
    subItems: [{ name: "Ecommerce", path: "/", pro: false }],
  },
  {
    icon: <ListTodo className="w-5 h-5" />,
    name: "PQRS",
    subItems: [
      { name: "Lista", path: "/pqrs", pro: false },
      { name: "Crear", path: "/pqrs/create", pro: false },
    ],
  },
  {
    icon: <Calendar className="w-5 h-5" />,
    name: "Calendar",
    path: "/calendar",
  },
  {
    icon: <UserCircle className="w-5 h-5" />,
    name: "User Profile",
    path: "/profile",
  },
  {
    name: "Forms",
    icon: <ListTodo className="w-5 h-5" />,
    subItems: [{ name: "Form Elements", path: "/form-elements", pro: false }],
  },
  {
    name: "Tables",
    icon: <Table className="w-5 h-5" />,
    subItems: [{ name: "Basic Tables", path: "/basic-tables", pro: false }],
  },
  {
    name: "Pages",
    icon: <FileText className="w-5 h-5" />,
    subItems: [
      { name: "Blank Page", path: "/blank", pro: false },
      { name: "404 Error", path: "/error-404", pro: false },
    ],
  },
];

const othersItems: NavItem[] = [
  {
    icon: <PieChart className="w-5 h-5" />,
    name: "Charts",
    subItems: [
      { name: "Line Chart", path: "/line-chart", pro: false },
      { name: "Bar Chart", path: "/bar-chart", pro: false },
    ],
  },
  {
    icon: <Boxes className="w-5 h-5" />,
    name: "UI Elements",
    subItems: [
      { name: "Alerts", path: "/alerts", pro: false },
      { name: "Avatar", path: "/avatars", pro: false },
      { name: "Badge", path: "/badge", pro: false },
      { name: "Buttons", path: "/buttons", pro: false },
      { name: "Images", path: "/images", pro: false },
      { name: "Videos", path: "/videos", pro: false },
    ],
  },
  {
    icon: <Plug className="w-5 h-5" />,
    name: "Authentication",
    subItems: [
      { name: "Sign In", path: "/signin", pro: false },
      { name: "Sign Up", path: "/signup", pro: false },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  useEffect(() => {
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? navItems : othersItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({ type: menuType as "main" | "others", index });
              submenuMatched = true;
            }
          });
        }
      });
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`group flex items-center gap-3 rounded-lg px-4 py-3 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-boxdark-2 ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "bg-gray-100 dark:bg-boxdark-2"
                  : ""
              } ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"}`}
            >
              <span className="flex-shrink-0">{nav.icon}</span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="font-medium">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDown
                  className={`ml-auto h-5 w-5 transition-transform ${
                    openSubmenu?.type === menuType && openSubmenu?.index === index ? "rotate-180" : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                to={nav.path}
                className={`group flex items-center gap-3 rounded-lg px-4 py-3 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-boxdark-2 ${
                  isActive(nav.path) ? "bg-gray-100 dark:bg-boxdark-2 font-medium" : ""
                } ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"}`}
              >
                <span className="flex-shrink-0">{nav.icon}</span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="font-medium">{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-1 space-y-1 pl-12">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      to={subItem.path}
                      className={`block rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-boxdark-2 ${
                        isActive(subItem.path) ? "bg-gray-100 dark:bg-boxdark-2 font-medium" : ""
                      }`}
                    >
                      {subItem.name}
                      <span className="ml-2 flex items-center gap-1">
                        {subItem.new && <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-200">new</span>}
                        {subItem.pro && <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-800 dark:bg-purple-900 dark:text-purple-200">pro</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <>
      {/* Fuerza Tailwind a generar clases críticas de TailAdmin */}
      <ForceTailwindClasses />

      <aside
        className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-boxdark text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-stroke dark:border-strokedark
          ${isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"}
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0`}
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className={`py-8 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}
        >
          <Link to="/">
            {isExpanded || isHovered || isMobileOpen ? (
              <>
                <img
                  className="dark:hidden"
                  src="/images/logo/logo.svg"
                  alt="Logo"
                  width={150}
                  height={40}
                />
                <img
                  className="hidden dark:block"
                  src="/images/logo/logo-dark.svg"
                  alt="Logo"
                  width={150}
                  height={40}
                />
              </>
            ) : (
              <img src="/images/logo/logo-icon.svg" alt="Logo" width={32} height={32} />
            )}
          </Link>
        </div>

        <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
          <nav className="mb-6">
            <div className="flex flex-col gap-4">
              <div>
                <h2
                  className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 dark:text-gray-500 ${
                    !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? "Menu" : <MoreHorizontal className="size-6" />}
                </h2>
                {renderMenuItems(navItems, "main")}
              </div>

              <div>
                <h2
                  className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 dark:text-gray-500 ${
                    !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? "Others" : <MoreHorizontal className="size-6" />}
                </h2>
                {renderMenuItems(othersItems, "others")}
              </div>
            </div>
          </nav>

          {(isExpanded || isHovered || isMobileOpen) && <SidebarWidget />}
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;