import { Body, Controller, Delete, Get, Post, Query, Req, Param, Patch } from "@nestjs/common";
import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthRequest } from "../common/types/auth-request";

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Roles("admin", "manager", "operator", "vendedor", "comprador")
  async list(@Req() req: AuthRequest, @Query("limit") limit?: string) {
    const parsedLimit = Math.min(Math.max(parseInt(limit || "200", 10) || 200, 1), 500);
    return this.productsService.list(req, parsedLimit);
  }

  @Get(":id")
  @Roles("admin", "manager", "operator", "vendedor", "comprador")
  async getOne(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.productsService.getById(req, id);
  }

  @Post()
  @Roles("admin", "manager", "comprador")
  async create(@Req() req: AuthRequest, @Body() dto: CreateProductDto) {
    return this.productsService.create(req, dto);
  }

  @Patch(":id")
  @Roles("admin", "manager", "comprador")
  async update(@Req() req: AuthRequest, @Param("id") id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(req, id, dto);
  }

  @Delete(":id")
  @Roles("admin")
  async remove(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.productsService.remove(req, id);
  }
}
